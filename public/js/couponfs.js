!(function($) {
    window.Base64 = {
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        encode: function(str) {
            var out = "",
                c1, c2, c3,
                outC1, outC2, outC3, outC4, i = 0;
            str = Base64._utf8_encode(str);
            while (i < str.length) {
                c1 = str.charCodeAt(i++);
                c2 = str.charCodeAt(i++);
                c3 = str.charCodeAt(i++);
                outC1 = c1 >> 2;
                outC2 = (c1 & 0x03) << 4 | c2 >> 4;
                outC3 = (c2 & 0x0f) << 2 | c3 >> 6;
                outC4 = c3 & 0x3f;
                if (isNaN(c2)) {
                    outC3 = outC4 = 64
                } else if (isNaN(c3)) {
                    outC4 = 64
                }
                out = out + this._keyStr.charAt(outC1) + this._keyStr.charAt(outC2) + this._keyStr.charAt(outC3) + this._keyStr.charAt(outC4)
            }
            return out
        },
        decode: function(str) {
            var out = '',
                c1, c2, c3, c4, outC1, outC2, outC3, i = 0;
            str = str.replace(/[^A-Za-z0-9+/=]/g, "");
            while (i < str.length) {
                c1 = this._keyStr.indexOf(str.charAt(i++));
                c2 = this._keyStr.indexOf(str.charAt(i++));
                c3 = this._keyStr.indexOf(str.charAt(i++));
                c4 = this._keyStr.indexOf(str.charAt(i++));
                outC1 = c1 << 2 | c2 >> 4;
                outC2 = (c2 & 0x0f) << 4 | c3 >> 2;
                outC3 = (c3 & 0x03) << 6 | c4;
                out = out + String.fromCharCode(outC1);
                if (c3 != 64) {
                    out = out + String.fromCharCode(outC2)
                }
                if (c4 != 64) {
                    out = out + String.fromCharCode(outC3)
                }
            }
            out = Base64._utf8_decode(out);
            return out
        },
        _utf8_encode: function(str) {
            str = str.replace(/\r\n/g, "\n");
            var out = "";
            for (var n = 0; n < str.length; n++) {
                var unicode = str.charCodeAt(n);
                if ((unicode >= 0x0001) && (unicode <= 0x007f)) {
                    out += str.charAt(n);
                } else if (unicode > 0x07ff) {
                    out += String.fromCharCode(0xe0 | ((unicode >> 12) & 0x0f));
                    out += String.fromCharCode(0x80 | ((unicode >> 6) & 0x3f));
                    out += String.fromCharCode(0x80 | ((unicode >> 0) & 0x3f));
                } else {
                    out += String.fromCharCode(0xc0 | ((unicode >> 6) & 0x1f));
                    out += String.fromCharCode(0x80 | ((unicode >> 0) & 0x3f));
                }
            }
            return out;
        },
        _utf8_decode: function(str) {
            var out = "",
                n = 0,
                c1, c2, c3;
            c1 = c2 = c3 = 0;
            while (n < str.length) {
                c1 = str.charCodeAt(n);
                if (c1 < 0x80) {
                    out += String.fromCharCode(c1);
                    n++
                } else if (c1 > 0xc0 && c1 < 0xe0) {
                    c2 = str.charCodeAt(n + 1);
                    out += String.fromCharCode((c1 & 0x1f) << 6 | c2 & 0x3f);
                    n += 2
                } else {
                    c2 = str.charCodeAt(n + 1);
                    c3 = str.charCodeAt(n + 2);
                    out += String.fromCharCode((c1 & 0x0f) << 12 | (c2 & 0x3f) << 6 | c3 & 0x3f);
                    n += 3
                }
            }
            return out
        }
    };

    $('.coupons-container').on('click', function() {
        var mobData = {
            "source_id": 39,
            "model_id": 2,
            "position_id": 1,
            "param": {}
        };
        var couponId = getMeetYouGoodsInfo().couponId;
        mobData.coupon_id = couponId;
        $('<iframe>').css({
            width: '0px',
            height: '0px',
            display: 'none'
        }).attr({
            src: 'meiyou:///ebMobPath?params=' + Base64.encode(JSON.stringify(mobData))
        }).appendTo('body');
    });
    $('.item-detail').on('click', function() {
        var mobData = {
            "source_id": 39,
            "model_id": 3,
            "position_id": 1,
            "param": {}
        };
        var couponId = getMeetYouGoodsInfo().couponId;
        mobData.coupon_id = couponId;

        $('<iframe>').css({
            width: '0px',
            height: '0px',
            display: 'none'
        }).attr({
            src: 'meiyou:///ebMobPath?params=' + Base64.encode(JSON.stringify(mobData))
        }).appendTo('body');
    });
    $('.link').on('click', function() {
        var mobData = {
            "source_id": 39,
            "model_id": 4,
            "position_id": 1,
            "param": {}
        };
        var couponId = getMeetYouGoodsInfo().couponId;
        mobData.coupon_id = couponId;
        $('<iframe>').css({
            width: '0px',
            height: '0px',
            display: 'none'
        }).attr({
            src: 'meiyou:///ebMobPath?params=' + Base64.encode(JSON.stringify(mobData))
        }).appendTo('body');
    });
})($);