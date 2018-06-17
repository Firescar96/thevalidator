(function() {
  //get the phrases marked by the user
  let highlightedText = Array.from(document.getElementsByClassName("validatorTextHighlight"))
    .map(x => x.innerText)

  chrome.runtime.sendMessage({
      action: "getExtractedText",
      text: highlightedText,
  });
})()
