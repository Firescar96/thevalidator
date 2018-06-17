//get the text selected by the cursor
function getSelectedText() {
    var text = "";
    var activeEl = document.activeElement;
    var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
    if (
      (activeElTagName == "textarea") || (activeElTagName == "input" &&
      /^(?:text|search|password|tel|url)$/i.test(activeEl.type)) &&
      (typeof activeEl.selectionStart == "number")
    ) {
        text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
    } else if (window.getSelection) {
        text = window.getSelection().toString();
    }

    if(text == "") return null;
    return text;
}

document.onmouseup = document.onkeyup = function() {
  let selectedText = getSelectedText();
  if(!selectedText) return;

  var range               = window.getSelection().getRangeAt(0);
  var selectionContents   = range.extractContents();
  var span                = document.createElement("span");
  span.appendChild(selectionContents);
  span.setAttribute("class","validatorTextHighlight");

  span.style.backgroundColor  = "red";
  span.style.color            = "white";

  //insert the highlight element
  range.insertNode(span);

  //clear the cursor's selected text
  if (window.getSelection) {window.getSelection().removeAllRanges();}
 else if (document.selection) {document.selection.empty();}
};
