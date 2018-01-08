'use strict'

const OpenTimestamps = require('javascript-opentimestamps');
const ConvertOTS = require('/src/convert2ots.js');
const Tools = ConvertOTS.Tools;
const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;
const Ops = OpenTimestamps.Ops;

var chainpoint = {
    "@context": "https://w3id.org/chainpoint/v2",
    "type": "ChainpointSHA256v2",
    "targetHash": "bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2",
    "merkleRoot": "51296468ea48ddbcc546abb85b935c73058fd8acdb0b953da6aa1ae966581a7a",
    "proof": [
        {
            "left": "bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2"
        },
        {
            "left": "cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf"
        },
        {
            "right": "cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf"
        }
    ],
    "anchors": [
        {
            "type": "BTCOpReturn",
            "sourceId": "f3be82fe1b5d8f18e009cb9a491781289d2e01678311fe2b2e4e84381aafadee"
        }
    ]
};

// FILE

$( document ).ready(function() {


    $('#document_holder').on('drop', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).removeClass('hover');
        var f = event.originalEvent.dataTransfer.files[0];
        if (f === undefined){
            return;
        }
        Document.setFile(f);
        Document.show();
        Document.upload(f);
        return false;
    });
    $('#document_holder').on('dragover', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).addClass('hover');
        return false;
    });
    $('#document_holder').on('dragleave', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).removeClass('hover');
        return false;
    });
    $('#document_holder').click(function (event) {
        console.log('document_holder : click');
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('document_input').click();
        return false;
    });
    $('#document_input').change(function (event) {
        var f = event.target.files[0];
        if (f === undefined){
            return;
        }
        Document.setFile(f);
        Document.show();
        Document.upload(f);
    });
    $('#convertButton').click(function (event) {
        if (Document.data) {
            run(Document.filename, JSON.parse(Document.data));
        } else {
            failureStamp("To <strong>convert</strong> you need to drop a file in the Data field")
        }
    });

});



/*
 * GLOBAL PROOF OBJ
 */
var Document = {
    setFile : function(file){
        this.data = undefined;
        this.filename = file.name;
        this.filesize = file.size;
    },
    setArray : function(buffer){
        this.data = buffer;
        this.filename = undefined;
        this.filesize = undefined;
    },
    upload: function (file) {
        // Read and crypt the file
        var self = this;
        var reader = new FileReader();
        reader.onload = function (event) {
            var data = event.target.result;
            self.data = String(String(data));
            self.filename = file.name;
            self.filesize = file.size;
            console.log('proof: ' + self.data);
            self.show();
        };
        reader.readAsBinaryString(file);
    },
    show: function() {
        hideMessages();
        if (this.filename) {
            $(".result-description").html(this.filename);
        } else {
            $(".result-description").html("Unknown name");
        }
        if (this.filesize) {
            $(".result-description").append(" " + humanFileSize(this.filesize, true));
        } else {
            $(".result-description").append(" " + humanFileSize(this.data.length, true));
        }
    },
    progressStart : function(){
        this.percent = 0;

        var self = this;
        this.interval = setInterval(() => {
            self.percent += parseInt(self.percent/3) + 1;
        if (self.percent > 100) {
            self.percent = 100;
        }
        loading(self.percent + ' %', 'Verify')
    }, 100);
    },
    progressStop : function(){
        clearInterval(this.interval);
    }
};

// RUN CONVERT TO OTS

function run(filename, chainpoint){

    // Check chainpoint file
    if (chainpoint['@context'] !== 'https://w3id.org/chainpoint/v2') {
        failure('Support only chainpoint v2');
        return;
    }
    if (chainpoint.type !== 'ChainpointSHA256v2') {
        failure('Support only ChainpointSHA256v2');
        return;
    }
    if (chainpoint.anchors === undefined) {
        failure('Support only timestamps with attestations');
        return;
    }


    // Output information
    console.log('File type: ' + chainpoint.type);
    console.log('Target hash: ' + chainpoint.targetHash);

    // Check valid chainpoint merkle
    const merkleRoot = ConvertOTS.calculateMerkleRoot(chainpoint.targetHash, chainpoint.proof);
    if (merkleRoot !== chainpoint.merkleRoot) {
        failure('Invalid merkle root');
        return;
    }

    // Migrate proof
    let timestamp;
    try {
        timestamp = ConvertOTS.migrationMerkle(chainpoint.targetHash, chainpoint.proof);
        // Console.log(timestamp.strTree(0, 1));
    } catch (err) {
        failure('Building error');
        return;
    }

    // Migrate attestation
    try {
        ConvertOTS.migrationAttestations(chainpoint.anchors, timestamp);
        // Console.log(timestamp.strTree(0, 1));
    } catch (err) {
        failure('Attestation error');
        return;
    }


    // Resolve unknown attestations
    const promises = [];
    const stampsAttestations = timestamp.directlyVerified();
    stampsAttestations.forEach(subStamp => {
        subStamp.attestations.forEach(attestation => {
            console.log('Find op_return: ' + Tools.bytesToHex(attestation.payload));
            const txHash = Tools.bytesToHex(attestation.payload);
            promises.push(ConvertOTS.resolveAttestation(txHash, subStamp, true));
        });
    });

    Promise.all(promises.map(Tools.hardFail))
        .then(() => {
            // Print attestations
            const attestations = timestamp.getAttestations();
            attestations.forEach(attestation => {
                console.log('OTS attestation: ' + attestation.toString());
            });

            // Store to file
            const detached = new DetachedTimestampFile(new Ops.OpSHA256(), timestamp);
            const ctx = new Context.StreamSerialization();
            detached.serialize(ctx);
            download(filename, ctx.getOutput());
        })
        .catch(err => {
            failure('Resolve attestation error: ' + err);
            return;
        });
}


// Save ots file
function saveTimestamp(filename, timestamp) {
    const detached = new DetachedTimestampFile(new Ops.OpSHA256(), timestamp);
    const ctx = new Context.StreamSerialization();
    detached.serialize(ctx);
    success('Success');
    //saveOts(filename, ctx.getOutput());
}

/*
 * COMMON FUNCTIONS
 */
// Human file size
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

// Download file
function download(filename, text) {
    var blob = new Blob([text], {type: "octet/stream"});
    saveAs(blob,  filename + '.ots');
}

// Alerts
function loading(title, text){
    console.log(text);
    $('#stamp .statuses_hashing .statuses-title').html(title);
    $('#stamp .statuses_hashing .statuses-description').html(text);
    $('#stamp .statuses_hashing').show();
}
function success(text){
    console.log(text);
    hideMessages();
    $('#stamp .statuses_success .statuses-title').html("SUCCESS!");
    $('#stamp .statuses_success .statuses-description').html(text);
    $('#stamp .statuses_success').show();
}
function failure(text){
    console.log(text);
    hideMessages();
    $('#stamp .statuses_failure .statuses-title').html("FAILURE!");
    $('#stamp .statuses_failure .statuses-description').html(text);
    $('#stamp .statuses_failure').show();
}

function hideMessages() {
    $('#stamp .statuses_hashing').hide();
    $('#stamp .statuses_failure').hide();
    $('#stamp .statuses_success').hide();
}
