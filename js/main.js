var bitcore = require('bitcore-lib');

$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();
});

// Closes the sidebar menu
$("#menu-close").click(function(e) {
    e.preventDefault();
    $("#sidebar-wrapper").toggleClass("active");
});
// Opens the sidebar menu
$("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#sidebar-wrapper").toggleClass("active");
});
// Scrolls to the selected menu item on the page
$(function() {
    $('a[href*=#]:not([href=#],[data-toggle],[data-target],[data-slide])').click(function() {
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
//#to-top button appears after scrolling
var fixed = false;
$(document).scroll(function() {
    if ($(this).scrollTop() > 250) {
        if (!fixed) {
            fixed = true;
            // $('#to-top').css({position:'fixed', display:'block'});
            $('#to-top').show("slow", function() {
                $('#to-top').css({
                    position: 'fixed',
                    display: 'block'
                });
            });
        }
    } else {
        if (fixed) {
            fixed = false;
            $('#to-top').hide("slow", function() {
                $('#to-top').css({
                    display: 'none'
                });
            });
        }
    }
});


var hash;

(function() {
// your page initialization code here
// the DOM will be available here
var timestamped_data_holder = document.getElementById('timestamped_data_holder');
var state = document.getElementById('status');

if (typeof window.FileReader === 'undefined') {
state.className = 'fail';
} else {
state.className = 'success';
}

document.getElementById('timestamped_data_input').addEventListener('change', function(evt) {
  var f = evt.target.files[0];
  handleFileSelect(f);
}, false);

document.getElementById('verifyButton').onclick = function(e) {
e.preventDefault();
$('#loading').show();
$('#status2').hide();
$('#alertMessage').hide();
$('#successMessage').hide();
$('#dangerMessage').hide();

if(!hash) {
  alert("Select a document first");
  return;
}
var stamp;
try {
  var stampString = document.getElementById('jsonstamp').value;
  console.log("verifyButton clicked");
  var stamp = JSON.parse(stampString);
  if(stamp.ots1) {
    stamp=stamp.ots1;
  }
  if(stamp.OpenTimestamps.path) {
    stamp=stamp.OpenTimestamps.path;
  }

} catch(e) {
  console.log("cannot parse as json, trying removing first two lines");
  try {
    //remove first two lines and retry
    var splitted=stampString.split("\n");
    var firstTwoRemoved=splitted.slice(2,splitted.length).join("\n");
    stamp = JSON.parse( firstTwoRemoved );
  } catch(e2) {
    console.log("cannot parse as json removing first two lines");
    try {
      var splitted=stampString.split("\n");
      var firstThreeRemoved=splitted.slice(3,splitted.length).join("\n");
      stamp = JSON.parse( firstThreeRemoved );
    } catch(e3) {
      console.log("cannot parse as json removing first three lines");
    }
  }
}

if(!stamp) {
  alert("Stamp data is not a valid");
  return;
}
verify(hash,stamp);
}

})();

function danger(text) {
$('#loading').hide();
$('#dangerMessage').show();
$('#dangerMessage').html("<strong>FAIL!</strong> " +text);
}

function alert(text) {
$('#loading').hide();
$('#alertMessage').show();
$('#alertMessage').html("<strong>ALERT!</strong> " + text);
}


function success(text) {
$('#loading').hide();
$('#successMessage').show();
$('#successMessage').html("<strong>SUCCESS!</strong> " + text);
}


timestamped_data_holder.ondragover = function () { this.className = 'hover'; return false; };
timestamped_data_holder.ondragend = function () { this.className = ''; return false; };
timestamped_data_holder.ondrop = function (e) {
this.className = '';
e.preventDefault();
var file = e.dataTransfer.files[0];
handleFileSelect(file);

return false;
};


function status(text) {
document.getElementById('status').innerText = text ;
}

function crypto_callback(p) {
status('Hashing ' + (p*100).toFixed(0) + '% completed');
}

timestamped_data_holder.onclick = function () {
console.log("holder.onclick");

document.getElementById('timestamped_data_input').click(
);
};

function humanFileSize(bytes, si) {
var thresh = si ? 1000 : 1024;
if(Math.abs(bytes) < thresh) {
    return bytes + ' B';
}
var units = si
    ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
    : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
var u = -1;
do {
    bytes /= thresh;
    ++u;
} while(Math.abs(bytes) >= thresh && u < units.length - 1);
return bytes.toFixed(1)+' '+units[u];
}


function handleFileSelect(file) {
document.getElementById('timestamped_data_name').innerText = file.name;
document.getElementById('timestamped_data_size').innerText = humanFileSize(file.size,true);

reader = new FileReader();
reader.onload = function (event) {

var data = event.target.result;
setTimeout(function() {
    CryptoJS.SHA256(data, crypto_callback, crypto_finish);
  }, 200);
};
console.log(file);
reader.readAsBinaryString(file);
}


function verify(hash, stamp) {
try {
var stampHash=stamp[0]
var merklePathOperations=stamp[1];
var timestampSignature=stamp[2];
if(hash!=stampHash) {
  alert("Document hash and stamp hash does not match.")
  return;
}

var value = hash;
for (var i = 1; i < merklePathOperations.length; i++) {
  current = merklePathOperations[i];
  console.log("value=" + value);
  value = exec(current[0], current[1], value, current[2]);
}

var finalValue = finalExec(timestampSignature[0], timestampSignature[1], timestampSignature[2], value, timestampSignature[3] )

console.log("Block hash=" + finalValue);
var finalValueBuffer = new bitcore.deps.Buffer(finalValue,"hex");
var reversed = bitcore.util.buffer.reverse(finalValueBuffer).toString("hex");
$('#status2').text("Block hash is " + reversed);
$('#status2').show();
askBlock(reversed);

} catch(e) {
alert(e);
}
}


function finalExec(what, chain, prefix, prec, suffix) {
if( what=="block_header" && chain=="bitcoin-mainnet" ) {
return exec("sha256",exec("sha256",prefix,prec,suffix),"","");
} else {
throw new Exception("error");
}
}
function exec(what, prefix, prec, suffix) {
value=new bitcore.deps.Buffer(prefix + prec + suffix, "hex");
if("sha256" == what) {
h=bitcore.crypto.Hash.sha256(value);
return h.toString('hex');
} else if("reverse" == what) {
return bitcore.util.buffer.reverse(value).toString("hex");
} else if("ripemd160" == what) {
h=bitcore.crypto.Hash.ripemd160(value);
return h.toString('hex');
} else {
throw new Exception("error");
}
}


function crypto_finish(val) {
hash=val;
console.log("crypto_finish " + hash);
status("Document hash is " + hash );

/*document.getElementById('hashinput').value=hash ;*/

}

var blockProviders = ["https://insight.bitpay.com/api/block/",
"https://www.localbitcoinschain.com/api/block/",
//"https://blockchain.info/it/rawblock/",
"http://vr4.synaptica.info:3000/api/block/"];

var results = [];


function askBlock(hash) {
var promises=[];
for(var i = 0; i< blockProviders.length ; i++) {
var url = blockProviders[i] + hash;
var req = makeRequest({
  method:"GET",
  url:url,
  timeout: 5000
});
promises.push(req);
}
Promise.all(promises.map(softFail)).then(function(data) {
var found=false;
for(var i = 0; i< data.length ; i++) {
  try {
    var result=JSON.parse(data[i].response);
    var time = result['time'];
    console.log(time);
    if(results.indexOf(time)>=0) {
      console.log("found twice!");
      var a = new Date(time * 1000);
      success("Data was created on or before " + a);
      found=true;
    }
    results.push(time);
  } catch(e) {}
}
if(!found) {
  danger("Can't verify the block hash with a block explorer (maybe connection problem).<br>You should manually verify the block hash");
}

});

}

function softFail(promise) {
return new Promise(function(resolve, reject) {
promise
.then(resolve)
.catch(resolve)
})
}

function makeRequest (opts) {
return new Promise(function (resolve, reject) {
var now = Date.now();
var xhr = new XMLHttpRequest();
xhr.timeout= opts.timeout || 5000;
xhr.open(opts.method, opts.url);
xhr.onload = function () {
  if (this.status >= 200 && this.status < 300) {
    var data = {};
    data['response']= xhr.response;
    data['elapsed'] = Date.now() - now;
    resolve(data);
  } else {
    reject({
      status: this.status,
      statusText: xhr.statusText,
      m: "statusNot200",
      opts: opts,
      elapsed : Date.now() - now
    });
  }
};
xhr.onerror = function () {
  reject({
    status: this.status,
    statusText: xhr.statusText,
    m: "error",
    opts: opts,
    elapsed : Date.now() - now
  });
};
xhr.ontimeout = function () {
  reject({
    status: this.status,
    statusText: xhr.statusText,
    m: "timeout",
    opts: opts,
    elapsed : Date.now() - now
  });
};
if (opts.headers) {
  Object.keys(opts.headers).forEach(function (key) {
    xhr.setRequestHeader(key, opts.headers[key]);
  });
}
var params = opts.params;
// We'll need to stringify if we've been given an object
// If we have a string, this is skipped.
if (params && typeof params === 'object') {
  params = Object.keys(params).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
}
xhr.send(params);
});
}
