import MIMEType from 'whatwg-mimetype';
import { ResponseShape } from '../graph/index.js';

export const isOk = (response: ResponseShape): boolean => {
  const statusCode = response.statusCode ?? -1;
  return statusCode < 400 && statusCode > 99;
};

export const isRedirect = (response: ResponseShape): boolean => {
  const statusCode = response.statusCode ?? -1;
  return statusCode < 400 && statusCode >= 300;
};

export const isError = (response: ResponseShape): boolean => {
  const statusCode = response.statusCode ?? -1;
  return statusCode >= 400 || statusCode < 100;
};

export const isText = (response: ResponseShape): boolean => {
  if ((response.headers['content-type'] ?? '').length === 0) return false;
  const mime = new MIMEType(response.headers['content-type'] ?? '');
  return mime.type === 'text';
};

export const isHtml = (response: ResponseShape): boolean => {
  if ((response.headers['content-type'] ?? '').length === 0) return false;
  const mime = new MIMEType(response.headers['content-type'] ?? '');
  return mime.isHTML();
};

export const isTextData = (response: ResponseShape): boolean => {
  if ((response.headers['content-type'] ?? '').length === 0) return false;
  const mime = new MIMEType(response.headers['content-type'] ?? '');
  return (
    mime.isXML() || ['json', 'json+ld', 'csv', 'tsv'].includes(mime.subtype)
  );
};

export const isMedia = (response: ResponseShape): boolean => {
  if ((response.headers['content-type'] ?? '').length === 0) return false;
  const mime = new MIMEType(response.headers['content-type'] ?? '');
  return ['image', 'video', 'audio'].includes(mime.type);
};

export const isJavascript = (response: ResponseShape): boolean => {
  if ((response.headers['content-type'] ?? '').length === 0) return false;
  const mime = new MIMEType(response.headers['content-type'] ?? '');
  return mime.isJavaScript();
};

export const isDesignAsset = (response: ResponseShape): boolean => {
  if ((response.headers['content-type'] ?? '').length === 0) return false;
  const mime = new MIMEType(response.headers['content-type'] ?? '');
  return mime.subtype === 'css' || mime.type === 'font';
};

export const isApp = (response: ResponseShape): boolean => {
  if ((response.headers['content-type'] ?? '').length === 0) return false;
  const mime = new MIMEType(response.headers['content-type'] ?? '');
  return mime.type === 'application';
};

export const isPdf = (response: ResponseShape): boolean => {
  if ((response.headers['content-type'] ?? '').length === 0) return false;
  const mime = new MIMEType(response.headers['content-type'] ?? '');
  return mime.type === 'application' && mime.subtype === 'pdf';
};

export const isDownload = (i: ResponseShape): boolean => {
  return isTextData(i) || isDesignAsset(i) || isApp(i);
};
