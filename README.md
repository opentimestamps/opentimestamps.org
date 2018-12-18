# opentimestamps.org

Official OpenTimestamps website
[`opentimestamps.org`]


## Pages

#### index.html
Stamp new data and verify stamped data.
At the end of stamp operation, the ots proof download starts automatically.
At the end of verify operation, if the ots proof change (with complete attestation) the ots proof download starts automatically.


Get parameters:
* digest : hash (sha256) of the data to timestamp (optional).
* ots : ots proof in hexadecimal format (optional).

### info.html
Parse the ots proof in a nice representation.

Get parameters:
* ots : ots proof in hexadecimal format (mandatory).

## Command

### Install dependencies.
Resolve and install dependencies.
```
npm install --only=dev
```

### Build
Compile css, build javascript and dependencies.
```
gulp default
```

### Start
The simplest way to start this server is:
```
gulp server
```

