const OpenTimestamps = require('javascript-opentimestamps');

hexToBytes = function (hex) {
	const bytes = [];
	for (let c = 0; c < hex.length; c += 2) {
		bytes.push(parseInt(hex.substr(c, 2), 16));
	}
	return bytes;
};

function stamp(filename, hash) {
	loadingStamp('0%','Hashing');
	// Check parameters

	const hashdata = new Uint8Array(hexToBytes(hash));

	// OpenTimestamps command
	const timestampBytesPromise = OpenTimestamps.stamp(hashdata,true);
	timestampBytesPromise.then(timestampBytes => {
		console.log('STAMP result : ');
	console.log(timestampBytes);
	download(filename, timestampBytes);
}).catch(err => {
	console.log("err "+err);
failureStamp("" + err);
});
}

function verify(ots, hash, filename) {
	// Check parameters
	const bytesOts = ots;
	const bytesHash = new Uint8Array(hexToBytes(hash));
	// OpenTimestamps command
	const verifyPromise = OpenTimestamps.verify(bytesOts, bytesHash, true);
	verifyPromise.then(result => {
		if (result === undefined) {
		failureVerify('Pending or Bad attestation');
		upgrade(ots, hash, filename);
	} else {
		successVerify('Bitcoin attests data existed as of ' + (new Date(result * 1000)));
		Proof.progressStop();
	}
}
).catch(err => {
	failureVerify('Verify error');
	Proof.progressStop();
})
;
}

let upgrade_first = true;
function upgrade(ots, hash, filename) {
	// Check not loop race condition
	if (upgrade_first == false) {
		return;
	}
	upgrade_first = false;

	// Check parameters
	const bytesOts = ots;

	// OpenTimestamps command
	const upgradePromise = OpenTimestamps.upgrade(bytesOts);
	upgradePromise.then(timestampBytes => {
		if (timestampBytes === undefined) {
		failureVerify('Upgrade error');
		Proof.progressStop();
	} else {
		successVerify('Timestamp has been successfully upgraded!');
		download(filename, timestampBytes);
		verify(timestampBytes, hash, filename);
	}
}).catch(err => {
	failureStamp('Upgrade error');
	Proof.progressStop();
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
	setHash : function(hash){
		this.filename = undefined;
		this.filesize = undefined;
		this.hash = hash;

	},
	setFile : function(file){
		this.hash = undefined;
		this.filename = file.name;
		this.filesize = file.size;
	},
	upload : function (file) {
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
			$("#document_filesize").html("");
		}
		if(this.hash) {
			$("#document_hash").html("From hash: " + this.hash);
		} else {
			$("#document_hash").html("");
		}
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
		Document.setFile(f);
		Document.show();
		Document.upload(f);
	});
	$('#stampButton').click(function (event) {
		if (Document.hash) {
			stamp(Document.filename, Document.hash);
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
		Proof.setFile(f);
		Proof.show();
		Proof.upload(f);
	});
	$('#verifyButton').click(function (event) {
		if (Proof.data && Document.hash) {
			Proof.progressStart();
			verify(Proof.data, Document.hash, Proof.filename);
		} else {
			failureVerify("To <strong>verify</strong> you need to drop a file in the Data field and a <strong>.ots</strong> receipt in the OpenTimestamps proof field")
		}
	});

	// Handle GET parameters
	const digest = getParameterByName('digest');
	if(digest) {
		Document.setHash(digest);
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
	var element = document.createElement('a');
	element.setAttribute('target', '_blank');
	element.href = window.URL.createObjectURL(new Blob([text], {type: 'octet/stream'}));
	element.download = filename + '.ots';
	document.getElementById('status').appendChild(element);
	successStamp('OpenTimestamps receipt created and download started');
	element.click();
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

function hex2ascii(hexx) {
	var hex = hexx.toString();//force conversion
	var str = '';
	for (var i = 0; i < hex.length; i += 2)
		str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str;
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


function loadingStamp(title, text){
	hideMessages();
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
	hideMessages();
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

function hideMessages() {
	$('#stamp .statuses_hashing').hide();
	$('#stamp .statuses_failure').hide();
	$('#stamp .statuses_success').hide();
	$('#verify .statuses_hashing').hide();
	$('#verify .statuses_failure').hide();
	$('#verify .statuses_success').hide();
}
