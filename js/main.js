const OpenTimestamps = require('javascript-opentimestamps');
const ByteBuffer = require('bytebuffer');

arrayToBytes = function (buffer) {
  const bytes = [];
  for (let c = 0; c < buffer.length; c++) {
    bytes.push(parseInt(buffer[c], 10));
  }
  return bytes;
};

function stamp(filename, hash) {
	loading();
    // Check parameters
	const hashdata = arrayToBytes( ByteBuffer.fromHex(hash).view ) ;
    // OpenTimestamps command
	const timestampBytesPromise = OpenTimestamps.stamp(hashdata,true);
	timestampBytesPromise.then(timestampBytes => {
		console.log('STAMP result : ');
		console.log(timestampBytes);
		download(filename, timestampBytes);
	}
	).catch(err => {
		console.log("err " + err);
		danger("" + err);
	});
}

function verify(ots, file) {
	loading();
    // Check parameters
	let bytesOts;
	if (ots instanceof Uint8Array) {
		bytesOts = ots;
	} else {
		bytesOts = ByteBuffer.fromBinary(ots).buffer;
	}
	const bytesFile = ByteBuffer.fromBinary(file).buffer;

    // OpenTimestamps command
	const verifyPromise = OpenTimestamps.verify(bytesOts, bytesFile);
	verifyPromise.then(result => {
		if (result === undefined) {
			alert('Pending or Bad attestation');
			upgrade(ots, file);
		} else {
			success('Success! Bitcoin attests data existed as of ' + (new Date(result * 1000)));
		}
	}
).catch(err => {
	danger('Verify error');
})
;
}

let upgrade_first = true;
function upgrade(ots, file) {
    // Check not loop race condition
	if (upgrade_first == false) {
		return;
	}
	upgrade_first = false;

    // Check parameters
	let bytesOts;
	if (ots instanceof Uint8Array) {
		bytesOts = ots;
	} else {
		bytesOts = ByteBuffer.fromBinary(ots).buffer;
	}

    // OpenTimestamps command
	const upgradePromise = OpenTimestamps.upgrade(bytesOts);
	upgradePromise.then(timestampBytes => {
		if (timestampBytes === undefined) {
			danger('Upgrade error');
		} else {
			success('Timestamp has been successfully upgraded!');
			download(proof_filename, timestampBytes);
			verify(timestampBytes, file);
		}
	}
).catch(err => {
	success('Upgrade error');
})
;
}

$(document).ready(function () {
	$('[data-toggle="tooltip"]').tooltip();
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
	$('a[href*=#]:not([href=#],[data-toggle],[data-target],[data-slide])').click(function () {
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
		document.getElementById('document_filename').innerText = f.name;
		document.getElementById('document_filesize').innerText = humanFileSize(f.size, true);
		document_handleFileSelect(f);
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
		console.log('document_input : change');
		var f = event.target.files[0];
		document.getElementById('document_filename').innerText = f.name;
		document.getElementById('document_filesize').innerText = humanFileSize(f.size, true);
		document_handleFileSelect(f);
	});
	$('#stampButton').click(function (event) {
		if (document_filename != '' && document_hash != '') {
			stamp(document_filename, document_hash);
		} else {
      danger("To <strong>stamp</strong> you need to drop a file in the Data field","")
    }
	});
          /* Proof section */
	$('#proof_holder').on('drop', function (event) {
		event.preventDefault();
		event.stopPropagation();
		$(this).removeClass('hover');
		var f = event.originalEvent.dataTransfer.files[0];
		document.getElementById('proof_filename').innerText = f.name;
		document.getElementById('proof_filesize').innerText = humanFileSize(f.size, true);
		proof_handleFileSelect(f);
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
		document.getElementById('proof_filename').innerText = f.name;
		document.getElementById('proof_filesize').innerText = humanFileSize(f.size, true);
		proof_handleFileSelect(f);
	});
	$('#verifyButton').click(function (event) {
		if (proof_data != '' && stamped_data != '') {
			verify(proof_data, stamped_data);
		} else {
      danger("To <strong>verify</strong> you need to drop a file in the Data field and a <strong>.ots</strong> receipt in the OpenTimestamps proof field","")
    }
	});
})();
      /*
       * HANDLE UPLOADED FILE
      */
var document_hash = '';
var document_data = '';
var document_filename = '';
var stamped_filename = '';
var stamped_data = '';
var proof_filename = '';
var proof_data = '';
      // Hash file generation : save the hash in the document_hash global variable
function document_handleFileSelect(file) {
          // Read and crypt the file
	let reader = new FileReader();

	reader.onload = function (event) {
		try {
			var data = event.target.result;
			document_data = String(String(data));
			document_filename = file.name;
			stamped_data = String(String(data));
			stamped_filename = file.name;
			setTimeout(function () {
				CryptoJS.SHA256(data, crypto_callback, crypto_finish);
			}, 200);

		} catch(err) {
			danger("" + err);
		}
	};
	console.log(file);
	if(file.size>100*1024*1024) {
		danger("File bigger than 100Mb are not supported in the browser at the moment");
	} else {
		reader.readAsBinaryString(file);
	}

	function crypto_callback(p) {
		alert('Hashing ' + (p * 100).toFixed(0) + '% completed');
	}
	function crypto_finish(hash) {
		document_hash = String(String(hash));
		document_filename = file.name;
		console.log('crypto_finish ' + hash);
		alert('Document hash is ' + hash);
	}
}
function proof_handleFileSelect(file) {
          // Read and crypt the file
	let reader = new FileReader();
	reader.onload = function (event) {
		var data = event.target.result;
		proof_data = String(String(data));
		proof_filename = file.name;
		console.log('proof: ' + proof_data);
	};
	reader.readAsBinaryString(file);
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
	var element = document.createElement('a');
	element.setAttribute('target', '_blank');
	element.href = window.URL.createObjectURL(new Blob([text], {type: 'octet/stream'}));
	element.download = document_filename + '.ots';
	document.getElementById('status').appendChild(element);
	success('OpenTimestamps receipt created and download started');
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
      /*
       * STATUS ALERT MESSAGES
       */
function danger(text, message) {
  if(message===undefined) {
    message='<strong>FAIL!</strong> ';
  }
	$('#loading').hide();
	hideMessages();
	$('#dangerMessage').show();
	$('#dangerMessage').html(message + text);
}
function alert(text) {
	$('#loading').hide();
	hideMessages();
	$('#alertMessage').show();
	$('#alertMessage').html(text);
}
function success(text) {
	$('#loading').hide();
	hideMessages();
	$('#successMessage').show();
	$('#successMessage').html('<strong>SUCCESS!</strong> ' + text);
}
function loading() {
	hideMessages();
	$('#loading').show();
}
function hideMessages() {
	$('#status').hide();
	$('#successMessage').hide();
	$('#alertMessage').hide();
	$('#dangerMessage').hide();
}
