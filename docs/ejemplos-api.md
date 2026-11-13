# Pruebas manuales de la API

Primero completar `.env`, configurar Firestore e iniciar `npm run start`. Los comandos siguientes envían peticiones al servidor real; requieren que esté ejecutándose. Los textos entre `<...>` son marcadores para reemplazar localmente, no credenciales incluidas en el proyecto.

## curl en Bash

Las variables y las comillas de esta sección corresponden a Bash (Linux, macOS o Git Bash). En PowerShell se puede usar la sección siguiente o Postman. Para no escribir la contraseña ni el token en el historial, se cargan con `read`.

```bash
BASE_URL='http://localhost:3000'

# Consultas públicas
curl -i "$BASE_URL/api/products"
curl -i "$BASE_URL/api/products/"

# Preparar el JSON de login sin interpolar la contraseña en el código
read -r -p 'Usuario: ' API_USERNAME
read -r -s -p 'Contraseña: ' API_PASSWORD
printf '\n'
export API_USERNAME API_PASSWORD

node -e 'process.stdout.write(JSON.stringify({username:process.env.API_USERNAME,password:process.env.API_PASSWORD}))' |
  curl -i -X POST "$BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' --data-binary @-

unset API_PASSWORD API_USERNAME

# Copiar sólo el valor accessToken de la respuesta. La entrada queda oculta.
read -r -s -p 'Token: ' TOKEN
printf '\n'

# Crear: guardar el id de documento devuelto
curl -i -X POST "$BASE_URL/api/products/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"title":"Cuaderno","price":1250.50,"category":"Librería","description":"80 hojas"}'

read -r -p 'ID del producto creado: ' PRODUCT_ID

# Usar el ID automático devuelto por Firestore
curl -i "$BASE_URL/api/products/$PRODUCT_ID"

curl -i -X PUT "$BASE_URL/api/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"title":"Cuaderno actualizado","price":1400,"category":"Librería","description":"100 hojas"}'

# Verificar persistencia de la actualización
curl -i "$BASE_URL/api/products/$PRODUCT_ID"

curl -i -X DELETE "$BASE_URL/api/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Debe devolver 404 después del borrado
curl -i "$BASE_URL/api/products/$PRODUCT_ID"

unset TOKEN
```

No guardar la salida del login ni capturas con su token en el repositorio. Los comandos de escritura envían credenciales en cabeceras; ejecutar sólo en un equipo propio y usar HTTPS cuando el servidor sea remoto.

## PowerShell

`Invoke-RestMethod` facilita el uso de JSON y evita los problemas de comillas de `curl.exe` en algunas versiones de Windows PowerShell. El ejemplo pide la contraseña con entrada oculta y la convierte a texto sólo para construir la petición HTTP.

```powershell
$baseUrl = 'http://localhost:3000'
Invoke-RestMethod "$baseUrl/api/products"

$username = Read-Host 'Usuario'
$securePassword = Read-Host 'Contraseña' -AsSecureString
$loginCredential = [PSCredential]::new($username, $securePassword)
$loginBody = @{
    username = $username
    password = $loginCredential.GetNetworkCredential().Password
} | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/login" -ContentType 'application/json' -Body $loginBody
Remove-Variable loginBody, loginCredential, securePassword
$headers = @{ Authorization = "Bearer $($login.accessToken)" }

$body = @{ title = 'Cuaderno'; price = 1250.50; category = 'Librería'; description = '80 hojas' } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/products/create" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
$productUrl = "$baseUrl/api/products/$($created.id)"
Invoke-RestMethod $productUrl

$updatedBody = @{ title = 'Cuaderno actualizado'; price = 1400; category = 'Librería'; description = '100 hojas' } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri $productUrl -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($updatedBody))
Invoke-RestMethod $productUrl

Invoke-RestMethod -Method Delete -Uri $productUrl -Headers $headers
Remove-Variable headers, login

# Al consultar nuevamente, PowerShell informa el 404 esperado
Invoke-RestMethod $productUrl
```

## Postman

1. Crear una variable local `baseUrl` con `http://localhost:3000`.
2. Enviar `POST {{baseUrl}}/api/auth/login`, Body → raw → JSON, con `username` y `password` propios. Marcar los valores sensibles como secretos o guardarlos en el Vault local de Postman. No compartirlos ni exportarlos.
3. Copiar `accessToken` y configurarlo en Authorization → Bearer Token para POST, PUT y DELETE.
4. Crear un producto con `POST {{baseUrl}}/api/products/create` y el JSON de ejemplo del README. Guardar el `id` recibido como `productId`.
5. Consultar `GET {{baseUrl}}/api/products/{{productId}}` y el listado sin autorización.
6. Modificar con `PUT {{baseUrl}}/api/products/{{productId}}`, enviando todos los campos obligatorios. Consultar otra vez para comprobar la persistencia.
7. Eliminar con DELETE y verificar que una nueva consulta devuelva 404.

## Casos de error para comprobar

| Prueba manual | Resultado esperado |
| --- | --- |
| POST con `price: -1` y token válido | 400 |
| POST con `price: "100"` y token válido | 400 |
| PUT sólo con `{ "price": 100 }` y token válido | 400 |
| POST sin Authorization | 401 |
| POST con `Authorization: Bearer token-invalido` | 401 |
| Login con contraseña incorrecta | 401 |
| Token correctamente firmado y vigente con rol diferente de admin | 403; cubierto por las pruebas automatizadas, el login de la demo sólo emite rol admin |
| GET con un ID inexistente o una ruta desconocida | 404 |
| Más de 10 solicitudes de login desde la misma IP en 15 minutos | 429 |
| Caída de Firestore después del arranque | 500 general; cubierto con fallos simulados en `npm test` |

Ejecuté `npm run test:firestore` con un proyecto Firestore real y la prueba de integración fue aprobada. Verifiqué la conexión, la lectura de productos, el login JWT y la creación, consulta, actualización, persistencia y eliminación de un documento temporal. Mantengo los ejemplos anteriores como guía para repetir el recorrido de forma manual. Para hacerlo en otro entorno, cada persona debe configurar sus propias credenciales; las que utilicé son privadas y no forman parte del repositorio.
