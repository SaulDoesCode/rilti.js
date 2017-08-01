importScripts("/rilti-site/highlight.pack.js");

onmessage = e => {
  const {rawCode, href} = e.data;

  postMessage({
    href,
    value: hljs.highlightAuto(rawCode).value
  });
}
