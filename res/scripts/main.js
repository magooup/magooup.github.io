/**
 * Created by zhiyong.ma on 2016/6/7.
 */
(function () {
    var MuEditor = function (editor, previewer) {
        if (typeof editor === 'string') {
            this.editor = document.getElementById(editor);
        }
        if (typeof previewer === 'string') {
            this.previewer = document.getElementById(previewer);
        }
        if (!this.editor || typeof this.editor !== 'object') {
            throw  new Error('Wrong editor');
        }
        if (!this.previewer || typeof  this.previewer !== 'object') {
            throw  new Error('Wrong previewer');
        }
        this.NAMESPACE_DEFAULT = "Default";
        this.KEY_SPLIT = "::";
        this.init();
    }
    MuEditor.prototype.init = function () {
        /* locate */
        this.locate();
        document.body.onresize = this.locate;
        this.initMarked();
        this.initAce();
    }
    MuEditor.prototype.initMarked = function () {
        /* marked */
        marked.setOptions({
            highlight: this.marked_code_highlight
        });
    }
    MuEditor.prototype.initAce = function () {
        /* ace */
        this.aceEditor = ace.edit(this.editor);
        this.aceEditor.session.setMode("ace/mode/markdown")// set markdown mode
        this.aceEditor.setFontSize(15); // set font-size
        this.aceEditor.renderer.setShowGutter(false); // disable the line-numbers
        this.aceEditor.renderer.setPadding(10); // set padding=10
        this.aceEditor.session.setUseWrapMode(true); // use wrap mode, force warp line
        //this.aceEditor.setTheme("ace/theme/dawn"); // set the theme
        this.aceEditor.setShowPrintMargin(false); // disable the print-margin
        this.aceEditor.setShowFoldWidgets(false); // disable fold wigets
        //this.aceEditor.setShowInvisibles(true); // show invisible characters
        this.aceEditor.$blockScrolling = Infinity; // disable warning message
        var that = this;
        this.aceEditor.on('change', function () {
            that.onEditing();
        }); // content-change event
        this.aceEditor.session.on('changeScrollTop', function () {
            that.onEditScroll();
        }); // scroll-top-change event for edit
        this.previewer.onscroll = function () {
            that.onPreviewScroll();
        }; // scroll-top-change event for edit
        this.loadByLocal(this.NAMESPACE_DEFAULT, "MuEditor");
        //reset the undo manager
        var undoManager = this.aceEditor.session.getUndoManager();
        undoManager.reset();
        this.aceEditor.session.setUndoManager(undoManager);
    }
    // code highlight, require 'highlight.js'
    MuEditor.prototype.marked_code_highlight = function (code, lang, callback) {
        if (hljs.getLanguage(lang)) {
            return hljs.highlight(lang, code).value;
        }
    }
    MuEditor.prototype.convert = function () {
        this.previewer.innerHTML = marked(this.aceEditor.getValue());
    }
    MuEditor.prototype.onEditing = function () {
        this.convert();
        this.store2Local(this.NAMESPACE_DEFAULT, "MuEditor");
    }
    MuEditor.prototype.getLastRowEle = function (row) {
        var ele;
        while (!ele && row >= 0) {
            ele = this.previewer.querySelector('[row_' + row + ']');
            row--;
        }
        return {e: ele, row: ++row};
    }
    MuEditor.prototype.getNextRowEle = function (row) {
        var ele;
        row += 1;
        while (!ele && row < this.aceEditor.session.getLength()) {
            ele = this.previewer.querySelector('[row_' + row + ']');
            row++;
        }
        return {e: ele, row: --row};
    }
    MuEditor.prototype.findPreviewingEle = function () {
        if (this.previewer.scrollTop === 0) {
            return {e: this.previewer.querySelector('[row_' + 0 + ']'), row: 0};
        }
        var cur = this.getNextRowEle(0);
        while (cur.e) {
            var next = this.getNextRowEle(cur.row);
            if (next.e && next.e.offsetTop - 19 > this.previewer.scrollTop) {
                return cur;
            }
            cur = next;
        }
    }
    MuEditor.prototype.onEditScroll = function () {
        if (!this.e_s_timer) {
            var that = this;
            this.e_s_timer = setTimeout(function () {
                try {
                    if (that.p_s_timer) {
                        return;
                    }
                    that.p_s_timer = 1;
                    console.log("catch edit scrolling.");
                    var vRow = that.aceEditor.getFirstVisibleRow();
                    var lastE = that.getLastRowEle(vRow);
                    if (!lastE.e) {
                        throw  new Error("Wrong lastE.");
                    }
                    var nextE = that.getNextRowEle(vRow);
                    var pDis, eDis, eLast = that.aceEditor.renderer.$cursorLayer.getPixelPosition({row: lastE.row}).top;
                    if (!nextE.e) {
                        pDis = previewer.scrollHeight - lastE.e.offsetTop;
                        eDis = that.aceEditor.renderer.$cursorLayer.getPixelPosition({row: that.aceEditor.session.getLength() - 1}).top - eLast;
                    } else {
                        pDis = nextE.e.offsetTop - lastE.e.offsetTop;
                        eDis = that.aceEditor.renderer.$cursorLayer.getPixelPosition({row: nextE.row}).top - eLast;
                    }
                    if (pDis <= 0 || eDis <= 0) {
                        throw new Error("Wrong Dis.");
                    }
                    var factor = pDis / eDis;
                    var eOffset = that.aceEditor.session.getScrollTop() - eLast;
                    that.previewer.scrollTop = lastE.e.offsetTop + eOffset * factor;
                } finally {
                    that.e_s_timer = undefined;
                    setTimeout(function () {
                        that.p_s_timer = 0;
                    }, 100);
                }
            }, 100);
        }
    }
    MuEditor.prototype.onPreviewScroll = function () {
        if (!this.p_s_timer) {
            var that = this;
            this.p_s_timer = setTimeout(function () {
                try {
                    if (that.e_s_timer) {
                        return;
                    }
                    that.e_s_timer = 1;
                    console.log("catch preview scrolling.");
                    var lastE = that.findPreviewingEle();
                    if (!lastE.e) {
                        throw new Error("Wrong lastE.");
                    }
                    var nextE = that.getNextRowEle(lastE.row);
                    var pDis, eDis, eLast = that.aceEditor.renderer.$cursorLayer.getPixelPosition({row: lastE.row}).top;
                    if (!nextE.e) {
                        pDis = that.previewer.scrollHeight - lastE.e.offsetTop;
                        eDis = that.aceEditor.renderer.$cursorLayer.getPixelPosition({row: that.aceEditor.session.getLength() - 1}).top - eLast;
                    } else {
                        pDis = nextE.e.offsetTop - lastE.e.offsetTop;
                        eDis = that.aceEditor.renderer.$cursorLayer.getPixelPosition({row: nextE.row}).top - eLast;
                    }
                    if (pDis <= 0 || eDis <= 0) {
                        throw new Error("Wrong Dis.");
                    }
                    var factor = eDis / pDis;
                    var pLast = lastE.e.offsetTop;
                    var pOffset = that.previewer.scrollTop - pLast;
                    that.aceEditor.session.setScrollTop(eLast + pOffset * factor);
                } finally {
                    that.p_s_timer = undefined;
                    setTimeout(function () {
                        that.e_s_timer = 0;
                    }, 100);
                }
            }, 100);
        }
    }

    MuEditor.prototype.store2Local = function (namespace, key) {
        localStorage.setItem(namespace + this.KEY_SPLIT + key, this.aceEditor.getValue());
    }
    MuEditor.prototype.loadByLocal = function (namespace, key) {
        if (localStorage.hasOwnProperty(namespace + this.KEY_SPLIT + key)) {
            this.aceEditor.setValue(localStorage.getItem(namespace + this.KEY_SPLIT + key), -1);
        }
    }
    MuEditor.prototype.locate = function () {
        var clientHeight = document.documentElement.clientHeight;
        var clientWidth = document.documentElement.clientWidth;
        var halfWidth = (clientWidth - 100) / 2;
        this.editor.setAttribute("style", "width:" + halfWidth + "px;height:" + (clientHeight - 90) + "px")
        this.previewer.setAttribute("style", "width:" + halfWidth + "px" + ";left:" + (halfWidth + 40) + "px;height:" + (clientHeight - 90) + "px");
        //document.getElementById("main").setAttribute("style", "height:" + (clientHeight - 50) + "px");
    }

    if (!window.edit) {
        window.edit = function (editor, previewer) {
            return new MuEditor(editor, previewer);
        }
    }
})();