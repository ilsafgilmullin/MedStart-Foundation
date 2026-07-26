# LiveKit infrastructure template

`livekit.yaml.example` is a safe starting template, not a ready production
secret file.

Before deployment:

1. copy it outside the repository to `livekit.yaml`;
2. replace every `REPLACE_*` value;
3. point `turn.example.ru` to the TURN/L4 public endpoint;
4. issue a trusted TLS certificate;
5. expose WSS on TCP 443 through a reverse proxy or load balancer;
6. expose RTC TCP 7881 and RTC UDP 7882;
7. map external TURN/TLS TCP 443 to internal 5349 on a separate public
   IP/L4 endpoint;
8. map external TURN/UDP 443 (and optionally 3478) to internal 3478;
9. keep the real config, keys and certificates outside Git and ZIP archives.

For the first production server, use the official LiveKit VM configuration
generator. This template documents the MedStart-required topology and provides
the values that must be preserved when adapting generated configuration.
