Create the private key and certificate by typing the following at the prompt:
openssl genrsa 1024 > private.key
openssl req -new -key private.key -out cert.csr
openssl x509 -req -in cert.csr -signkey private.key -out certificate.pem -days 365
openssl x509 -in certificate.pem -inform pem -outform der -out certificate.cer
