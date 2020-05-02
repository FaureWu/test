(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.test = {}));
}(this, (function (exports) { 'use strict';

  function hello() {
      return 'hello world';
  }
  // 哈哈哈

  exports.default = hello;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
