const removeDiacritics = require('diacritics').remove
const RangeList = require('./range-list')

/*
### Objectives
Puts a list of words in bold.
Indifferent to diacritics (éèïù....) and the case.

### usage
`WordsBolderify(query, path)`
- query : a string, word separator is a space caracter (' ')
- path : a string
return a string of html "beginning ofstring <b>a-word-in-bold</b>rest of string..."

### dependencies :
- diacritics
- range-list
- linked-list
*/

const wordsBolderify = function (query, path){
  const normalizedPath = removeDiacritics(path.toLowerCase())
  const words = removeDiacritics(query.toLowerCase()).split(' ').filter(Boolean)
  var boldRanges = new RangeList()
  for (let word of words) {
    let i = 0
    while (i != -1) {
      i = normalizedPath.indexOf(word,i)
      if (i != -1){
        boldRanges.addRange(i,i+word.length-1)
        i++
      }
    }
  }
  const ranges = boldRanges.ranges()
  if (ranges.length == 0) {
      return path
  }
  var html = ''
  var previousStop = 0
  for (let range of ranges) {
    html += path.slice(previousStop,range[0])
    previousStop = range[1]+1
    html += `<b>${path.slice(range[0], previousStop)}</b>`
  }
  return html + path.slice(previousStop)
}

module.exports = wordsBolderify
