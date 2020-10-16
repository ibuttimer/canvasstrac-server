Create the private key and certificate by typing the following at the prompt:

# openssl-genrsa, genrsa - generate an RSA private key
# openssl genrsa -help
openssl genrsa 1024 > private.key

# openssl-req, req - PKCS#10 certificate request and certificate generating utility
# openssl req -help
# -new         : New request
# -key val     : Private key to use
# -out outfile : Output file
openssl req -new -key private.key -out cert.csr

# openssl-x509, x509 - Certificate display and signing utility
# openssl x509 -help
# -req         : Input is a certificate request, sign and output
# -in infile   : Input file - default stdin
# -signkey val : Self sign cert with arg
# -out outfile : Output file - default stdout
# -days int    : How long till expiry of a signed certificate - def 30 days
openssl x509 -req -in cert.csr -signkey private.key -out certificate.pem -days 365

# -inform format  : Input format - default PEM (one of DER or PEM)
# -outform format : Output format - default PEM (one of DER or PEM)
openssl x509 -in certificate.pem -inform pem -outform der -out certificate.cer
