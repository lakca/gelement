# gelement

lightweight utility to create dom tree, with chainable methods.

## Usage

```js
const g = require('gelement')

const showInput = false

const last /* li#last */ = g('ul')
  .down('li').text('hello')
  .next('li')
    .down('a').attr('href', 'https://www.github.com').text('Github').text(' Location')
    .down()
  .next('li')
    .down('button').text('Click').on('click', console.log).key('button')
    .next('input').if(showInput).attr('readonly').attr('value', 'hwlloe')
    .down()
  .next('li').id('last')

const ul = last.start

console.log(ul.toString())
// <ul><li>hello</li><li><a href="https://www.github.com">Github Location</a></li><li><button>Click</button></li><li id="last"></li></ul>

last.node('button').el.click()
```
