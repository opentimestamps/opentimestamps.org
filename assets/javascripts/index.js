const OpenTimestamps = require('javascript-opentimestamps');

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
		console.log('STAMP result : ');
		const ctx = new OpenTimestamps.Context.StreamSerialization();
		detached.serialize(ctx);
		const timestampBytes = ctx.getOutput();
		download(filename, timestampBytes);
		Document.progressStop();
		successStamp('OpenTimestamps receipt created and download started');
	}).catch(err => {
		console.log("err "+err);
		Document.progressStop();
		failureStamp("" + err);
	});
}

function verify(ots, hash, hashType, filename) {
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
	const detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(string2Bin(ots));
	OpenTimestamps.verify(detachedOts,detached).then( (result)=>{
		if (result === undefined) {
			if (!Proof.upgraded) {
				upgrade(ots, hash, hashType, filename);
				Proof.upgraded = true;
			} else {
				Proof.progressStop();
				warningVerify('Pending or Bad attestation');
			}
		} else {
			Proof.progressStop();
			successVerify('Bitcoin attests data existed as of ' + (new Date(result * 1000)));
		}
	}).catch(err => {
		Proof.progressStop();
		failureVerify('Verify error');
	});
}

function upgrade(ots, hash, hashType, filename) {
	// Check not loop race condition
	if (Proof.upgraded == true) {
		return false;
	}

	// OpenTimestamps command
	const detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(string2Bin(ots));
	OpenTimestamps.upgrade(detachedOts).then( (changed)=>{
		if(changed){
			successVerify('Timestamp has been successfully upgraded!');
			download(filename, timestampBytes);
			verify(timestampBytes, hash, hashType, filename);
		} else {
			Proof.progressStop();
			failureVerify('File not changed');
		}
	}).catch(err => {
		Proof.progressStop();
		warningVerify('Pending or Bad Attestation');
	});
}

$(document).ready(function () {
	hideMessages();
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



/*
 * GLOBAL DOCUMENT OBJ
 */

var Document = {
	setHash : function(hash,hashType){
		this.filename = undefined;
		this.filesize = undefined;
		this.hash = hash;
		this.hashType = (hashType === undefined)? "SHA256" : hashType;
	},
	setFile : function(file,hashType){
		this.hash = undefined;
		this.filename = file.name;
		this.filesize = file.size;
		this.hashType = (hashType === undefined)? "SHA256" : hashType;
	},
	/*upload : function (file) {
		var self = this;
		// Read and crypt the file
		var reader = new FileReader();
		reader.onload = function (event) {
			try {
				var data = event.target.result;
				setTimeout(function () {
					CryptoJS.SHA256(data, crypto_callback, crypto_finish);
				}, 200);

			} catch (err) {
				failureStamp("" + err);
			}
		};
		if (file.size > 100 * 1024 * 1024) {
			failureStamp("File bigger than 100Mb are not supported in the browser at the moment");
		} else {
			reader.readAsBinaryString(file);
		}
		function crypto_callback(p) {
			loadingStamp((p * 100).toFixed(0) + '%', 'Hashing');
		}
		function crypto_finish(hash) {
			console.log('crypto_finish ' + hash);
			self.hash = String(String(hash));
			self.show();
		}
	},*/
	upload : function (file) {

		var lastOffset = 0;
		function callbackRead(reader, file, evt, callbackProgress, callbackFinal){
			if(lastOffset === reader.offset) {
				console.log("order",reader.offset, reader.size, reader.result);
				lastOffset = reader.offset+reader.size;
				callbackProgress(evt.target.result);
				if ( reader.offset + reader.size >= file.size ){
					callbackFinal();
				}
			} else {
				console.log("not in order",reader.offset, reader.size, reader.result);
				timeout = setTimeout(function () {
					callbackRead(reader,file,evt, callbackProgress, callbackFinal);
				}, 100);
			}
		}

		function parseFile(file, callbackProgress, callbackFinal) {
			var chunkSize  = 1024*1024; // bytes
			var offset     = 0;

			var size=chunkSize;
			var partial;
			var index = 0;
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

		var counter = 0;
		var self = this;
		var shaObj = new jsSHA("SHA-256", "ARRAYBUFFER");
		console.log("file length: "+file.size);
		loadingStamp('0%', 'Hashing');

		parseFile(file,
			function (data) {

				shaObj.update(data);
				counter += data.byteLength;
				loadingStamp((( counter / file.size)*100).toFixed(0) + '%', 'Hashing');
				//console.log((( counter / file.size)*100).toFixed(0) + '%', 'Hashing');

			}, function (data) {

				self.hash = shaObj.getHash("HEX");
				console.log('crypto_finish ' + self.hash);
				self.show();

			});

	},
	show : function(){
		hideMessages();
		if(this.filename) {
			$("#document_filename").html(this.filename);
		} else {
			$("#document_filename").html("Unknown name");
		}
		if(this.filesize) {
			$("#document_filesize").html(" " + humanFileSize(this.filesize, true));
		} else {
			$("#document_filesize").html("&nbsp;");
		}
		if(this.hash) {
			$("#document_hash").html("Hash: " + this.hash);
		} else {
			$("#document_hash").html("&nbsp;");
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
		loadingStamp(self.percent + ' %', 'Stamping')
		}, 100);
	},
	progressStop : function(){
		clearInterval(this.interval);
	}
};


/*
 * GLOBAL PROOF OBJ
 */
var Proof = {
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
			$("#proof_filename").html(this.filename);
		} else {
			$("#proof_filename").html("Unknown name");
		}
		if (this.filesize) {
			$("#proof_filesize").html(" " + humanFileSize(this.filesize, true));
		} else {
			$("#proof_filesize").html(" " + humanFileSize(this.data.length, true));
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
				loadingVerify(self.percent + ' %', 'Verify')
			}, 100);
	},
	progressStop : function(){
		clearInterval(this.interval);
	}
};

/*
* STARTUP FUNCTION
*/

(function () {
	// your page initialization code here
	// the DOM will be available here
	/*
	 *Document section
	 events handle to easy file uploading : drop, drag-over, drag-leave, click, file change
	 */

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
	$('#stampButton').click(function (event) {
		if (Document.hash) {
			stamp(Document.filename, Document.hash, Document.hashType);
		} else {
			failureStamp("To <strong>stamp</strong> you need to drop a file in the Data field")
		}
	});
	/* Proof section */
	$('#proof_holder').on('drop', function (event) {
		event.preventDefault();
		event.stopPropagation();
		$(this).removeClass('hover');
		var f = event.originalEvent.dataTransfer.files[0];
		if (f === undefined){
			return;
		}
		Proof.setFile(f);
		Proof.show();
		Proof.upload(f);
		return false;
	});
	$('#proof_holder').on('dragover', function (event) {
		event.preventDefault();
		event.stopPropagation();
		$(this).addClass('hover');
		return false;
	});
	$('#proof_holder').on('dragleave', function (event) {
		event.preventDefault();
		event.stopPropagation();
		$(this).removeClass('hover');
		return false;
	});
	$('#proof_holder').click(function (event) {
		event.preventDefault();
		event.stopPropagation();
		document.getElementById('proof_input').click();
		return false;
	});
	$('#proof_input').change(function (event) {
		var f = event.target.files[0];
		if (f === undefined){
			return;
		}
		Proof.setFile(f);
		Proof.show();
		Proof.upload(f);
	});
	$('#verifyButton').click(function (event) {
		if (Proof.data && Document.hash) {
			Proof.progressStart();
			Proof.upgraded = false;
			verify(Proof.data, Document.hash, Document.hashType, Proof.filename);
		} else {
			failureVerify("To <strong>verify</strong> you need to drop a file in the Data field and a <strong>.ots</strong> receipt in the OpenTimestamps proof field")
		}
	});
	$('#infoButton').click(function (event) {
		if (Proof.data) {
			location.href = "./info.html?ots="+bytesToHex(string2Bin(Proof.data));
		} else {
			failureVerify("To <strong>info</strong> you need to drop a file in the Data field and a <strong>.ots</strong> receipt in the OpenTimestamps proof field")
		}
	});

	// Handle GET parameters
	const digest = getParameterByName('digest');
	if(digest) {
		Document.setHash(digest, "SHA256");
		Document.show();
	}
	const ots = getParameterByName('ots');
	if(ots) {
		Proof.setArray(hex2ascii(ots));
		Proof.show();
	}
	// autorun proof
	if(digest && ots){
		$('#verifyButton').click();
	}

})();


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


function loadingStamp(title, text){
	$('#stamp .statuses_hashing .statuses-title').html(title);
	$('#stamp .statuses_hashing .statuses-description').html(text);
	$('#stamp .statuses_hashing').show();
}
function successStamp(text){
	hideMessages();
	$('#stamp .statuses_success .statuses-title').html("SUCCESS!");
	$('#stamp .statuses_success .statuses-description').html(text);
	$('#stamp .statuses_success').show();
}
function failureStamp(text){
	hideMessages();
	$('#stamp .statuses_failure .statuses-title').html("FAILURE!");
	$('#stamp .statuses_failure .statuses-description').html(text);
	$('#stamp .statuses_failure').show();
}

function loadingVerify(title, text){
	$('#verify .statuses_hashing .statuses-title').html(title);
	$('#verify .statuses_hashing .statuses-description').html(text);
	$('#verify .statuses_hashing').show();
}
function successVerify(text){
	hideMessages();
	$('#verify .statuses_success .statuses-title').html("SUCCESS!");
	$('#verify .statuses_success .statuses-description').html(text);
	$('#verify .statuses_success').show();
}
function failureVerify(text){
	hideMessages();
	$('#verify .statuses_failure .statuses-title').html("FAILURE!");
	$('#verify .statuses_failure .statuses-description').html(text);
	$('#verify .statuses_failure').show();
}
function warningVerify(text){
    hideMessages();
    $('#verify .statuses_warning .statuses-title').html("WARNING!");
    $('#verify .statuses_warning .statuses-description').html(text);
    $('#verify .statuses_warning').show();
}

function hideMessages() {
	$('#stamp .statuses_hashing').hide();
	$('#stamp .statuses_failure').hide();
	$('#stamp .statuses_success').hide();
	$('#verify .statuses_hashing').hide();
	$('#verify .statuses_failure').hide();
	$('#verify .statuses_success').hide();
    $('#verify .statuses_warning').hide();
}
