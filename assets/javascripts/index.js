
/* OpenTimestamps functions */

const OpenTimestamps = window.OpenTimestamps;

function stamp(filename, hash, hashType) {
	Document.progressStart();

	var op;
	if (hashType == "SHA1"){
		op = new OpenTimestamps.Ops.OpSHA1();
	}else if (hashType == "SHA256"){
		op = new OpenTimestamps.Ops.OpSHA256();
	}else if (hashType == "RIPEMD160"){
		op = new OpenTimestamps.Ops.OpRIPEMD160();
	} else {
		op = new OpenTimestamps.Ops.OpSHA256();
	}
	const detached = OpenTimestamps.DetachedTimestampFile.fromHash(op, hexToBytes(hash));

	OpenTimestamps.stamp(detached).then( ()=>{
		const ctx = new OpenTimestamps.Context.StreamSerialization();
		detached.serialize(ctx);
		const timestampBytes = ctx.getOutput();
		download(filename, timestampBytes);
		Document.progressStop();
		success('OpenTimestamps receipt created and download started');
	}).catch(err => {
		console.log("err "+err);
		Document.progressStop();
		failure("" + err);
	});
}

function upgrade_verify(ots, hash, hashType, filename) {
	// OpenTimestamps command
	var op;
	if (hashType == "SHA1"){
		op = new OpenTimestamps.Ops.OpSHA1();
	}else if (hashType == "SHA256"){
		op = new OpenTimestamps.Ops.OpSHA256();
	}else if (hashType == "RIPEMD160"){
		op = new OpenTimestamps.Ops.OpRIPEMD160();
	} else {
		op = new OpenTimestamps.Ops.OpSHA256();
	}
	const detached = OpenTimestamps.DetachedTimestampFile.fromHash(op, hexToBytes(hash));
	const detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(ots);

    Proof.progressStart();

    // OpenTimestamps upgrade command
    OpenTimestamps.upgrade(detachedOts).then( (changed)=>{
        const bytes = detachedOts.serializeToBytes();
    	if(changed){
        	//success('Timestamp has been successfully upgraded!');
            filename = filename || hash + ".ots";
        	download(filename, bytes);

        	// update proof
        	Proof.data = bin2String(bytes);
    	} else {
        	// File not changed: just upgraded
    	}
    	return OpenTimestamps.verify(detachedOts,detached)
    }).then( (results)=>{
        Proof.progressStop();

        if( Object.keys(results).length == 0 ){
        	// no attestation returned
			if (detachedOts.timestamp.isTimestampComplete()) {
                Proof.progressStop();
                // check attestations
                detachedOts.timestamp.allAttestations().forEach(attestation => {
                    if(attestation instanceof OpenTimestamps.Notary.UnknownAttestation){
                    	warning('Unknown attestation type');
                	}
            	});
    		} else {
                warning('The Bitcoin transaction is unconfirmed. The attestation is still pending. Once the transaction confirms, this file will be updated.');
			}
		} else {
			var text = "";
			Object.keys(results).map(chain => {
				var date = moment(results[chain].timestamp * 1000).tz(moment.tz.guess()).format('YYYY-MM-DD z')
                text += upperFirstLetter(chain) + ' block ' + results[chain].height + ' attests existence as of ' + date + '<br>';
    		});
        	success(text);
		}
	}).catch(err => {
        Proof.progressStop();
		failure(err.message);
	});
}

$(document).ready(function () {
//	$('[data-toggle="tooltip"]').tooltip();
});
// Closes the sidebar menu
$('#menu-close').click(function (e) {
	e.preventDefault();
	$('#sidebar-wrapper').toggleClass('active');
});
// Opens the sidebar menu
$('#menu-toggle').click(function (e) {
	e.preventDefault();
	$('#sidebar-wrapper').toggleClass('active');
});
// Scrolls to the selected menu item on the page
$(function () {
	$('a[href*=\\#]:not([href=\\#],[data-toggle],[data-target],[data-slide])').click(function () {
		if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') || location.hostname == this.hostname) {
			var target = $(this.hash);
			target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
			if (target.length) {
				$('html,body').animate({
					scrollTop: target.offset().top
				}, 1000);
				return false;
			}
		}
	});
});
// #to-top button appears after scrolling
var fixed = false;
$(document).scroll(function () {
	if ($(this).scrollTop() > 250) {
		if (!fixed) {
			fixed = true;
			// $('#to-top').css({position:'fixed', display:'block'});
			$('#to-top').show('slow', function () {
				$('#to-top').css({
					position: 'fixed',
					display: 'block'
				});
			});
		}
	} else if (fixed) {
		fixed = false;
		$('#to-top').hide('slow', function () {
			$('#to-top').css({
				display: 'none'
			});
		});
	}
});


/* Hashes object to handle different hashes */

var Hashes = {
	init(){
        this.progress = true;
        this["SHA1"] = CryptoJS.algo.SHA1.create();
        this["SHA256"] = CryptoJS.algo.SHA256.create();
        this["RIPEMD160"] = CryptoJS.algo.RIPEMD160.create();
	},
	getSupportedTypes(){
		return ["SHA1","SHA256","RIPEMD160"];
	},
	update(type,msg){
        this.progress = true;
        this[type].update(msg);
	},
	get(type){
        this.progress = false;
        if(this[type] === undefined){
            return undefined;
        }
		if(typeof(this[type])=="string"){
			return this[type];
		}
        this[type] = this[type].finalize().toString();
		return this[type];
	},
	set(type, hash){
        this.progress = false;
        this[type] = hash;
	}
}


/* Document object to upload & parse document file */

var Document = {
	init : function (){
        this.tagId = undefined;
        this.filename = undefined;
        this.filesize = undefined;
        Hashes.init();
	},
    setTagId : function(tagId){
        this.tagId = tagId;
    },
    setFile : function(file,hashType){
        this.filename = file.name;
        this.filesize = file.size;
    },
    exist : function(){
        return this.filename !== undefined && this.filesize !== undefined;
    },
	upload : function (file) {

		// callbackRead function
		var lastOffset = 0;
        var previous = [];
        function callbackRead(reader, file, evt, callbackProgress, callbackFinal){

            if(lastOffset !== reader.offset){
                // out of order
                //console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,">>buffer");
                previous.push({ offset: reader.offset, size: reader.size, result: reader.result});
                return;
            }

            function parseResult(offset, size, result) {
                lastOffset = offset + size;
                callbackProgress(result);
                if (offset + size >= file.size) {
                    lastOffset = 0;
                    callbackFinal();
                }
            }

            // in order
            //console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,"");
            parseResult(reader.offset, reader.size, reader.result);

            // resolve previous buffered
            var buffered = [{}]
            while (buffered.length > 0) {
                buffered = previous.filter(function (item) {
                    return item.offset === lastOffset;
                });
                buffered.forEach(function (item) {
                    //console.log("[", item.size, "]", item.offset, '->', item.offset + item.size, "<<buffer");
                    parseResult(item.offset, item.size, item.result);
                    previous.remove(item);
                })
            }
        }

        // loading function
        function loading(file, callbackProgress, callbackFinal) {
            var chunkSize  = 1024*1024; // bytes
            var offset     = 0;
            var size=chunkSize;
            var partial;
            var index = 0;

            if(file.size===0){
                callbackFinal();
            }
            while (offset < file.size) {
                partial = file.slice(offset, offset+size);
                var reader = new FileReader;
                reader.size = chunkSize;
                reader.offset = offset;
                reader.index = index;
                reader.onload = function(evt) {
                    callbackRead(this, file, evt, callbackProgress, callbackFinal);
                };
                reader.readAsArrayBuffer(partial);
                offset += chunkSize;
                index += 1;
            }
        }


        // start upload
		var counter = 0;
		var self = this;

        Hashes.init();
		hashing('0%');

        loading(file,
			function (data) {
				var wordBuffer = CryptoJS.lib.WordArray.create(data);
                Hashes.update("SHA1",wordBuffer);
                Hashes.update("SHA256",wordBuffer);
                Hashes.update("RIPEMD160",wordBuffer);
				counter += data.byteLength;
				hashing((( counter / file.size)*100).toFixed(0) + '%');

			}, function (data) {
                hashing('100%');
                console.log('SHA1 '+Hashes.get("SHA1"));
                console.log('SHA256 '+Hashes.get("SHA256"));
                console.log('RIPEMD160 '+Hashes.get("RIPEMD160"));
                self.show();
                self.callback();
			});
	},
	show : function(){
		if(this.filename) {
			$(this.tagId+" .filename").html(this.filename);
		} else {
			$(this.tagId+" .filename").html("Unknown name");
		}
		if(this.filesize) {
			$(this.tagId+" .filesize").html(" " + humanFileSize(this.filesize, true));
		} else {
			$(this.tagId+" .filesize").html("&nbsp;");
		}

        var hashType = "SHA256";
        if (Proof.exist()) {
            hashType = Proof.getHashType().toUpperCase();
            if (!Hashes.getSupportedTypes().indexOf(hashType) === -1) {
                failure("Not supported hash type");
                return;
            }
        }
        if (!Hashes.getSupportedTypes().indexOf(hashType) === -1) {
            failure("Not supported hash type");
            return;
        }
        $(this.tagId+" .hash").html("");
        if (!Hashes.progress && Hashes.get(hashType)) {
            $(this.tagId+" .hash").html(hashType + ": " + Hashes.get(hashType));
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
		stamping(self.percent + ' %', 'Stamping')
		}, 100);
	},
	progressStop : function(){
		clearInterval(this.interval);
	},
	callback : function(){
		// Run automatically stamp or verify action
        if(Proof.exist()) {
            // Automatically verify
            run_verification();
        } else {
            // Automatically stamp
            run_stamping();
        }
	}
};

/* Proof object to upload & parse OTS file */

var Proof = {
    init : function(){
        this.tagId = undefined;
        this.data = undefined;
        this.filename = undefined;
        this.filesize = undefined;
    },
    isValid : function(fileName){
        const res = fileName.match(/\.[0-9a-z]+$/i);
		return res !== null && res.length > 0 && res[0] === ".ots";

    },
    setTagId : function(tagId){
        this.tagId = tagId;
    },
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
	exist : function(){
    	return this.filename !== undefined && this.filesize !== undefined && this.data !== undefined;
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
			self.show();
		};
		reader.readAsBinaryString(file);
	},
	show: function(tagId) {
		if (this.filename) {
			$(this.tagId+" .filename").html(this.filename);
		} else {
			$(this.tagId+" .filename").html("Unknown name");
		}
		if (this.filesize) {
			$(this.tagId+" .filesize").html(" " + humanFileSize(this.filesize, true));
		} else {
			$(this.tagId+" .filesize").html(" " + humanFileSize(this.data.length, true));
		}

        if (Proof.data) {
            var hashType = Proof.getHashType().toUpperCase();
            if (!Hashes.getSupportedTypes().indexOf(hashType) === -1) {
                failure("Not supported hash type");
                return;
            }
            var hash = Proof.getHash();
            $(this.tagId+" .hash").html("Stamped "+ hashType + " hash: " + hash);

            if (Document.exist()) {
                // Document just uploaded
                run_verification();
            } else {
                // Document not uploaded
                verifying("Upload original stamped data to verify");
            }
        }
	},
    getHashType : function (){
        const detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(string2Bin(this.data ));
        return detachedOts.fileHashOp._HASHLIB_NAME().toUpperCase();
    },
    getHash : function (){
        const detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(string2Bin(this.data ));
        return bytesToHex(detachedOts.fileDigest());
    },
    progressStart : function(){
        this.stopInterval = false;
		this.percent = 0;

		var self = this;
		this.interval = setInterval(() => {
				self.percent += parseInt(self.percent/3) + 1;
				if (self.percent > 100) {
					self.percent = 100;
				}
				if(self.stopInterval == false) {
                    verifying(self.percent + ' %', 'Verify')
                }
			}, 100);
	},
	progressStop : function(){
        this.stopInterval = true;
		clearInterval(this.interval);
	}
};

/*
* STARTUP FUNCTION
*/

(function () {
	// your page initialization code here
	// the DOM will be available here

	// Document/Proof upload on #document_holder box

	function document_holder_upload(f){
        if (f === undefined){
            return;
        }
        if (Proof.isValid(f.name)){
            Proof.init();
            Document.init();
            Proof.setFile(f);
            Proof.setTagId('#document_holder');
            Proof.show();
            Proof.upload(f);
            $('#stamped_holder').show();
            $("#result_stamp").hide();
            $("#result_verify").show();
        } else {
            Proof.init();
            Document.init();
            Document.setFile(f);
            Document.setTagId('#document_holder');
            Document.show();
            Document.upload(f);
            $('#stamped_holder').hide();
            $("#result_stamp").hide();
            $("#result_verify").hide();
        }
	}
	$('#document_holder').on('drop', function (event) {
		event.preventDefault();
		event.stopPropagation();
		$(this).removeClass('hover');
		var f = event.originalEvent.dataTransfer.files[0];
        document_holder_upload(f);
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
		event.preventDefault();
		event.stopPropagation();
		document.getElementById('document_input').click();
		return false;
	});
	$('#document_input').change(function (event) {
		var f = event.target.files[0];
        document_holder_upload(f);
		return false;
	});

    // Document upload on #stamped_holder box

	function stamped_holder_upload(f){
        if (f === undefined){
            return;
        }
        Document.init()
        Document.setFile(f);
        Document.setTagId('#stamped_holder');
        Document.show();
        Document.upload(f);
	}
    $('#stamped_holder').on('drop', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).removeClass('hover');
        var f = event.originalEvent.dataTransfer.files[0];
        stamped_holder_upload(f);
        return false;
    });
    $('#stamped_holder').on('dragover', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).addClass('hover');
        return false;
    });
    $('#stamped_holder').on('dragleave', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).removeClass('hover');
        return false;
    });
    $('#stamped_holder').click(function (event) {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('stamped_input').click();
        return false;
    });
    $('#stamped_input').change(function (event) {
        event.preventDefault();
        var f = event.target.files[0];
        stamped_holder_upload(f);
        return false;
    });

    // Get info action on ots

    $("#statuses .statuses-info").click(function (event) {
        event.preventDefault();
        run_info();
        return false;
    });


	// Handle GET parameters
	const digest = getParameterByName('digest');
    const algorithm = getParameterByName('algorithm');
	if(digest) {
		Hashes.init();
		Hashes.set(algorithm, digest);
		Document.show();
	}
	const ots = getParameterByName('ots');
	if(ots) {
		Proof.setArray(hex2ascii(ots));
		Proof.show();
	}
	// autorun proof
	if(digest && ots){
        run_verification();
	}

})();

/* Runnable functions on gui to start processes */

function run_stamping(){
    const algorithm = getParameterByName('algorithm');
    var hashType = "SHA256";
    if (algorithm){
        hashType = algorithm.toUpperCase();
    }
    if (Hashes.get(hashType)) {
        stamp(Document.filename, Hashes.get(hashType), hashType);
    } else {
        failure("To <strong>stamp</strong> you need to drop a file in the Data field");
    }
}

function run_verification(){
    if (Proof.data) {
        Proof.progressStart();

        var hashType = Proof.getHashType().toUpperCase();
        if (!Hashes.getSupportedTypes().indexOf(hashType) === -1) {
            failure("Not supported hash type");
            return;
        }
        if (!Hashes.get(hashType)){
            failure("No file to verify; upload one first");
            return;
        }
        Proof.upgraded = false;
        upgrade_verify(string2Bin(Proof.data), Hashes.get(hashType), hashType, Proof.filename);
    } else {
        failure("To <strong>verify</strong> you need to drop a file in the Data field and a <strong>.ots</strong> receipt in the OpenTimestamps proof field")
    }
}

function run_info(){
    if (Proof.data) {
        $("#info").show();
        $("#legend").show();
        location.href = "#info";
        Info.init(Proof.data);
    } else {
        failure("To <strong>info</strong> you need to drop a file in the Data field and a <strong>.ots</strong> receipt in the OpenTimestamps proof field")
    }
}


/*
 * INFO SECTION
 */

var Info = {
    init : function(data){
        var jsonString = OpenTimestamps.json(data);
        var obj = JSON.parse(jsonString);

        // Fill labels
        $("#hash").html(obj.hash);
        $("#error").html("");
        if(obj.result=="KO"){
            $("#error").html(obj.error);
        }
        $("#digest").html(obj.hash);
        $("#type").html(obj.op);
        $("#title_digest").html(obj.hash.substring(0, 12));
        $("#table").empty()
        this.container = $("#table")

        // Print timestamp
        Info.print(obj.timestamp);
    },
    print : function(timestamp){

        if(timestamp.attestations !== undefined ){
            timestamp.attestations.forEach(function(item){
                var div = Info.printAttestation(item,item.fork);
                Info.container.append(div);
                if(item.merkle !== undefined){
                    div = Info.printMerkle(item.merkle,item.fork);
                    Info.container.append(div);
                }
            });
        }

        if(timestamp.tx !== undefined ) {
            var div = Info.printTx(timestamp.tx,timestamp.ops[0].fork);
            Info.container.append(div);
        }

        if(timestamp.ops === undefined ){
            return;
        }

        if(timestamp.ops.length > 1){
            var subdiv = Info.printFork(timestamp.fork,timestamp.ops.length);
            Info.container.append(subdiv);

            var div = document.createElement('div');
            $(div).addClass("table-i");
            $(div).append("<div class='table'></div>");
            $(div).appendTo($("#table"));
            Info.container = $(div).find('div');

        }

        if(timestamp.ops.length > 0){
            timestamp.ops.forEach(function(item){
                var div = Info.printTimestamp(item.op,item.arg,item.result,item.fork);
                Info.container.append(div);
                Info.print(item.timestamp);
            });
        }
    },
    printAttestation : function(item,fork){
        var div = document.createElement('div');
        $(div).addClass("table-i");

        var title="Attestation";
        var color="grey";
        var content = "";
        if(item.type == "BitcoinBlockHeaderAttestation") {
            title = "Bitcoin Attestation";
            content = 'Merkle root of Bitcoin block ' +
                '<strong class="hash" style="display: inline;">' + item.param + '</strong>' +
                '<a class="copy"></a>' +
                '</div>';
            color = "green";
        } else if(item.type == "LitecoinBlockHeaderAttestation"){
            title = "Litecoin Attestation";
            content = 'Merkle root of Litecoin block ' +
                '<strong class="hash" style="display: inline;">'+item.param+'</strong>' +
                '<a class="copy"></a>' +
                '</div>';
            color="gold";
        } else if(item.type == "EthereumBlockHeaderAttestation"){
            title = "Ethereum Attestation";
            content = 'Merkle root of Ethereum block ' +
                '<strong class="hash" style="display: inline;">'+item.param+'</strong>' +
                '<a class="copy"></a>' +
                '</div>';
            color="gold";
        } else if(item.type == "PendingAttestation"){
            title = "Pending Attestation";
            content = "Pending attestation: server "+"<a href=''>"+item.param+"</a>";
            color="gold";
        } else if(item.type == "UnknownAttestation"){
            title = "Unknown attestation";
            content = "Unknown Attestation: payload "+"<a href=''>"+item.param+"</a>";
            color="grey"
        }

        var first = document.createElement('div');
        $(first).addClass("table-name "+color);
        $(first).html(title);
        $(first).appendTo(div);

        var second = document.createElement('div');
        $(second).addClass("table-value table-value_copy");
        $(second).append(content);
        $(second).appendTo(div);

        return div;
    },
    printMerkle : function(merkle,fork){
        var div = document.createElement('div');
        $(div).addClass("table-i");

        var title="Merkle Root";
        var content=merkle;
        var color="purple";

        var first = document.createElement('div');
        $(first).addClass("table-name "+color);
        $(first).html(title);
        $(first).appendTo(div);

        var second = document.createElement('div');
        $(second).addClass("table-value table-value_copy");
        $(second).append('<div class="badge"></div>');
        if(fork>0) {
            $(second).find(".badge").append('<p class="step">'+fork+'</p>');
        }
        $(second).find(".badge").append('<p class="hash">'+content+'</p>');
        $(second).find(".badge").append('<a class="copy"></a>');
        $(second).appendTo(div);

        return div;
    },
    printTx : function(tx,fork){
        var div = document.createElement('div');
        $(div).addClass("table-i");

        var title="Note";
        var content=tx;
        var color="purple";

        var first = document.createElement('div');
        $(first).addClass("table-name "+color);
        $(first).html(title);
        $(first).appendTo(div);

        var second = document.createElement('div');
        $(second).addClass("table-value table-value_copy");
        $(second).append('<p>Probably a Bitcoin transaction</p>');
        $(second).append('<div class="badge"></div>');

        if(fork>0) {
            $(second).find(".badge").append('<p class="step">'+fork+'</p>');
        }
        $(second).find(".badge").append('<p class="hash">'+content+'</p>');
        $(second).find(".badge").append('<a class="copy"></a>');
        $(second).appendTo(div);

        return div;
    },
    printFork : function(fork,totfork){
        var div = document.createElement('div');
        $(div).addClass("table-i");

        var title="Fork";
        var content="Fork in " + totfork + " paths";
        var color="blue";

        var first = document.createElement('div');
        $(first).addClass("table-name "+color);
        $(first).html(title);
        $(first).appendTo(div);


        var second = document.createElement('div');
        $(second).addClass("table-value");
        if(fork>0) {
            $(second).append('<p class="step">'+fork+'</p>');
        }
        $(second).append('<p class="">'+content+'</p>');
        $(second).appendTo(div);

        return div;
    },
    printTimestamp : function(op,arg,result,fork){
        var div = document.createElement('div');
        $(div).addClass("table-i");

        var content = result;
        if(arg.length>0){
            var start = (op=="append") ? content.lastIndexOf(arg) : content.indexOf(arg);
            var end = start+arg.length;
            content = result.substring(0, start)+"<span class='green'>"+arg+"</span>"+result.substring(end, result.length)
        }
        var title = op+"("+((arg.length>0)?arg.substring(0, 6)+'...':'')+")";
        var color="purple";

        var first = document.createElement('div');
        $(first).addClass("table-name ");
        $(first).html(title);
        $(first).appendTo(div);

        var second = document.createElement('div');
        $(second).addClass("table-value");
        $(second).append('<div class="badge"></div>');
        if(fork>0) {
            $(second).find(".badge").append('<p class="step">'+fork+'</p>');
        }
        $(second).find(".badge").append('<p class="hash">'+content+'</p>');
        $(second).appendTo(div);

        return div;
    }
}


/*
 * EXTENDS ARRAY
 */
Array.prototype.remove = Array.prototype.remove || function(val){
    var i = this.length;
    while(i--){
        if (this[i] === val){
            this.splice(i,1);
        }
    }
};

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

	saveAs(blob, filename + (Proof.isValid(filename) ? '' : '.ots') );
}

function string2Bin(str) {
	var result = [];
	for (var i = 0; i < str.length; i++) {
		result.push(str.charCodeAt(i));
	}
	return result;
}
function bin2String(array) {
	return String.fromCharCode.apply(String, array);
}

function ascii2hex(str) {
	var arr = [];
	for (var i = 0, l = str.length; i < l; i ++) {
		var hex = Number(str.charCodeAt(i)).toString(16);
		if (hex<0x10) {
			arr.push("0" + hex);
		} else {
			arr.push(hex);
		}
	}
	return arr.join('');
}

function hex2ascii(hexx) {
	var hex = hexx.toString();//force conversion
	var str = '';
	for (var i = 0; i < hex.length; i += 2)
		str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str;
}

function bytesToHex (bytes) {
	const hex = [];
	for (var i = 0; i < bytes.length; i++) {
		hex.push((bytes[i] >>> 4).toString(16));
		hex.push((bytes[i] & 0xF).toString(16));
	}
	return hex.join('');
};

function hexToBytes(hex) {
	const bytes = [];
	for (var c = 0; c < hex.length; c += 2) {
		bytes.push(parseInt(hex.substr(c, 2), 16));
	}
	return bytes;
};

function upperFirstLetter(string){
	return string[0].toUpperCase() + string.substr(1);
}


// get parameters
function getParameterByName(name, url) {
	if (!url) {
		url = window.location.href;
	}
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}


/*
 * STATUS ALERT MESSAGES
 */

function message(title, text, cssClass, showInfo){
	$('#statuses').attr('class','statuses '+cssClass);
    $('#statuses .statuses-title').html(title);
    $('#statuses .statuses-description').html(text);
    message_info(showInfo);
    $('#statuses').show();
}

function message_info(showInfo){
    if(showInfo != undefined && showInfo == true){
        $('#statuses .statuses-info').show();
    } else if(showInfo != undefined && showInfo == false){
        $('#statuses .statuses-info').hide();
    }
}

function verifying(text){
    message("VERIFYING", text, 'statuses_hashing', true);
}
function stamping(text){
    message("STAMPING", text, 'statuses_hashing', false);
}
function hashing(text){
    message("HASHING", text, 'statuses_hashing', false);
}
function success(text){
    message("SUCCESS!", text, 'statuses_success');
}
function failure(text){
    message("FAILURE!", text, 'statuses_failure');
}
function warning(text){
    message("WARNING!", text, 'statuses_warning');
}

/* Clipboard */
var clipboard = new Clipboard('.copy', {
    text: function(event) {
        var text = $(event).parent().find(".hash").html();
        console.log(text);

        $(".clipboard-copy")
          .css('display','block')
          .find('.badge-copy .hash')
          .html(text);

        setTimeout(function(){
          $(".clipboard-copy").css('display','none');
        },3000)
        return text;
    }
})
