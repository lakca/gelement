/**
 * @typedef {keyof HTMLElementTagNameMap} TagName
 */

/**
 * @template T
 * @param {T} v
 * @returns {T extends Array ? T : Array<T>}
 */
function strOrArr(v) {
  return Array.isArray(v) ? v : [v]
}

function gc(tag, type, chain) {
  switch (type) {
    case 'text':
      return new Gtext(tag, chain)
    case 'comment':
      return new Gcomment(tag, chain)
    default:
      return new Gelement(tag, chain)
  }
}

/**
 * @param {HTMLElement} el
 */
function removeElement(el) {
  if (el.parentNode) el.parentNode.removeChild(el)
}

/**
 * @param {Node} node
 * @param {Node} prevNode
 */
function insertAfter(node, prevNode) {
  if (node.nextSibling) {
    node.parentNode.insertBefore(prevNode, node.nextSibling)
  } else {
    node.parentNode.appendChild(prevNode)
  }
}

function parseTagInfo(tagInfo) {
  const reg = /(@|#)([^@#]*)/g
  const meta = {}
  let r = reg.exec(tagInfo)
  const tag = r ? tagInfo.slice(0, r.index) : tagInfo
  if (r) {
    do {
      if (meta[r[1]]) meta[r[1]].push(r[2])
      else meta[r[1]] = [r[2]]
    } while (r = reg.exec(tagInfo))
  }
  return { tag, meta }
}

class Gbase {
  /**
   * Creates an instance of Gelement.
   *
   * @param {Array<Gelement|Gtext>} chain
   * @memberof Gbase
   */
  constructor(chain = []) {
    this.chain = chain
    this.chain.push(this)
    /** Should mount element or not */
    this.flag = true
    /** tree level */
    this.level = 0
  }
  /**
   * Mount/Unmount element from parent node, and decide execute/skip the methods of modifying itself afterwards.
   *
   * @param {boolean} flag
   * @memberof Gbase
   */
  if(flag) {
    this.flag = flag
    if (!this.flag) {
      removeElement(this.el)
    } else {
      //  TODO:
      this.el.parentNode.appendChild(this.el)
    }
    return this
  }
  /**
   * key for filter/search.
   *
   * @param {*} key
   * @memberof Gbase
   */
  key(key) {
    this._key = key
    return this
  }
  /**
   * Search node in the chain.
   *
   * @param {*} key
   * @memberof Gbase
   */
  node(key) {
    for (const e of this.chain) {
      if (e._key === key) return e
    }
  }
  /**
   * Add next sibling element.
   *
   * @template {string} T
   * @template {string} TP
   * @template {TP extends 'text' ? Gtext : Gelement<T>} R
   * @param {T} tag
   * @param {TP} [type]
   * @returns {R}
   */
  next(tag, type) {
    if (!tag) return this
    if (Array.isArray(tag)) {
      return tag.reduce((p, c) => p.next(c), this)
    } else if (tag instanceof Gbase) {
      const next = tag
      next.level = this.level
      // had next element
      if (this.nextGelement) {
        this.chain.splice(this.chain.indexOf(this.nextGelement), 0, next)
        next.nextGelement = this.nextGelement
      } else {
        noneNext: {
          for (let i = this.chain.indexOf(this) + 1; i < this.chain.length; i++) {
            if (this.chain[i].level < this.level) {
              this.chain.splice(i, 0, next)
              break noneNext
            }
          }
          this.chain.push(next)
        }
      }
      this.nextGelement = next
      insertAfter(this.el, next.el)
      next.chain = this.chain
      next.parentGelement = this.parentGelement
      return next
    } else {
      return this.next(gc(tag, type))
    }
  }
  down() {
    return this.parentGelement
  }
  /**
   * Return chain start end.
   *
   * @returns
   */
  get start() {
    return this.chain[0]
  }
  get head() {
    return this.chain[0]
  }
}

class Gtext extends Gbase {
  constructor(text, chain) {
    super(chain)
    this.text = text
    this.el = document.createTextNode(text)
  }
  /**
   * Append data or replace the whole data.
   *
   * @param {string} text
   * @param {boolean} [replace=false]
   * @returns
   * @memberof Gtext
   */
  text(text, replace = false) {
    if (replace) {
      this.el.textContent = text
    } else {
      this.el.appendData(text)
    }
    return this
  }
  toString() {
    return this.el.data
  }
}

class Gcomment extends Gtext {
  constructor(text, chain) {
    super(chain)
    this.text = text
    this.el = document.createComment(text)
  }
}

/**
 * @template {TagName} T
 * @class Gelement<T>
 */
class Gelement extends Gbase {
  /**
   * Creates an instance of Gelement.
   *
   * @param {T} tag
   * @memberof Gelement
   */
  constructor(tagInfo, chain) {
    super(chain)
    const [tag, type] = tagInfo.split('@')
    /** @readonly */
    this.tag = tag
    /** @type {HTMLElementTagNameMap[T]} */
    this.el = document.createElement(tag)
    /** @type {{[x: string]: function}} */
    this.events = {}
    if (type) {
      if (tag === 'input') {
        this.attr('type', type)
      }
    }
  }
  /**
   * Append text content to the end replace the `textContent`.
   *
   * @param {string} text
   * @param {boolean} [replace=false]
   * @returns
   * @memberof Gelement
   */
  text(text, replace = false) {
    if (replace) {
      this.el.textContent = text
    } else {
      this.el.appendChild(document.createTextNode(text))
    }
    return this
  }
  /**
   * Set element attributes.
   *
   * @param {string|Record<string,true|false|any>} name
   * @param {true|false|any} [value=true] - `false` will remove the attribute;
   * @returns
   * @memberof Gelement
   */
  attr(name, value = true) {
    if (typeof name === 'string') {
      if (value === false) this.el.removeAttribute(name)
      else this.el.setAttribute(name, value)
    } else {
      Object.entries(name).forEach(entry => this.attr(this.el, ...entry))
    }
    return this
  }
  data(name, value) {
    this.el.dataset[name] = typeof value === 'object' ? JSON.stringify(value) : value
    return this
  }
  /**
   * Add event listener
   *
   * @param {string} event
   * @param {function} callback
   * @param {PropertyKey} [id] - callback id, to make remove easier
   * @returns
   * @memberof Gelement
   */
  on(event, callback, id) {
    const self = this
    if (typeof callback === 'function') {
      if (!this.events[event]) {
        this.events[event] = {
          handler(e) { console.log('dispath: ' + e); self.events[event].callbacks.forEach(cb => cb(e)) },
          callbacks: [],
          callbackIds: []
        }
        this.el.addEventListener(event, this.events[event].handler)
      }
      this.events[event].callbacks.push(callback)
      this.events[event].callbackIds.push(id)
    }
    return this
  }
  /**
   * @param {string} event
   * @param {any} callbackOrId
   * @memberof Gelement
   */
  off(event, callbackOrId) {
    if (callbackOrId != null && this.events[event]) {
      const index = typeof callbackOrId === 'function' ?
        this.events[event].callbacks.indexOf(callbackOrId) :
        this.events[event].callbackIds.indexOf(callbackOrId)
      if (index > -1) {
        this.events[event].callbacks.splice(index, 1)
        this.events[event].callbackIds.splice(index, 1)
      }
    }
    return this
  }
  /**
   * Set inline style.
   *
   * @param {string} inlineStyle
   * @returns
   * @memberof Gelement
   */
  style(inlineStyle) {
    if (typeof inlineStyle === 'string') {
      const style = this.el.getAttribute('style') || ''
      this.el.setAttribute('style', style + (/;$/.test(style.trim()) && '' || ';') + inlineStyle)
    } else {
      Object.assign(this.el.style, inlineStyle)
    }
    return this
  }
  /** Set element id attribute */
  id(id) {
    this.el.id = id
    return this
  }
  /**
   * Set class attribute.
   *
   * @param {null|string|string[]} adds - classes will be added
   * @param {null|string|string[]} moves - classes will be removed
   * @param {null|string|string[]} toggles - classes will be toggled
   * @param {true} empty - remove current classes
   * @memberof Gelement
   */
  class(adds, moves, toggles, empty) {
    if ([adds, moves, toggles, empty].includes(true)) this.el.removeAttribute('class')
    if (adds) this.el.classList.add(strOrArr(adds))
    if (moves) this.el.classList.remove(strOrArr(moves))
    if (toggles) this.el.classList.toggle(strOrArr(toggles))
    return this
  }
  /**
   * Add child element.
   *
   * @template {TagName} T
   * @param {T} tag
   * @returns {Gelement<T>}
   */
  down(tag, type) {
    if (Array.isArray(tag)) {
      if (!tag.length) return this
      const down = this.down(tag[0])
      tag.slice(1).reduce((p, c) => p.next(c), down)
      return down
    } else if (tag instanceof Gbase) {
      const down = this.downGelement = tag
      down.level = this.level + 1
      this.chain.splice(this.chain.indexOf(this) + 1, 0, down)
      this.el.prepend(down.el)
      down.chain = this.chain
      down.parentGelement = this
      return down
    } else if (tag) {
      return this.down(gc(tag, type))
    } else {
      return super.down()
    }
  }
  empty() {
    this.el.innerHTML = ''
    const startIndex = this.chain.indexOf(this) + 1
    return this
  }
  /**
   * Return `outerHTML`
   *
   * @returns
   * @memberof Gelement
   */
  toString() {
    return this.el.outerHTML
  }
}

function decorateClassMethod(cls, method, decorator) {
  if (Array.isArray(method))
    return method.map(e => decorateClassMethod(cls, e, decorator))
  Object.defineProperty(cls.prototype, method, decorator(cls, method, Object.getOwnPropertyDescriptor(cls.prototype, method)))
}

function decorateOnFlag(target, key, descriptor) {
  const origin = descriptor.value
  descriptor.value = function(...args) {
    if (this.flag) return origin.call(this, ...args)
    return this
  }
  return descriptor
}

decorateClassMethod(Gelement, ['text', 'class', 'attr', 'data', 'style', 'on', 'off'], decorateOnFlag)

/**
 * @template {TagName} T
 * @param {T} tag
 * @return {Gelement<T>}
 */
function g(tag) {
  return new Gelement(tag, [])
}

module.exports = g
