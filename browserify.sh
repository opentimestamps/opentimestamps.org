#!/bin/bash

browserify -r javascript-opentimestamps -r bytebuffer script.js -o js/bundle.js;
#cat bundle.js | sed -e "s/const output = this.buffer.buffer.subarray(0, this.buffer.offset);/const output = this.buffer.view.subarray(0, this.buffer.offset);/g" > bundle1.js ;
#cat bundle1.js | sed -e "s/return Utils.arrayToBytes(output.buffer);/return Utils.arrayToBytes(output.view);/g" > bundle.js ;
#rm bundle1.js;
#mv bundle.js js/bundle.js;
