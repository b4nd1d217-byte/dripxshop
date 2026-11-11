(()=>{'use strict';
const DEFAULT_MTA_PORT=22003;
function invalidAddress(){
 throw new Error('Introduce una IP pública válida: mtasa://IP:PUERTO o IP sin prefijo. No uses el puerto HTTP.');
}
function isIPv4(value){
 const parts=String(value||'').split('.');
 return parts.length===4&&parts.every(part=>/^(0|[1-9]\d{0,2})$/.test(part)&&Number(part)<=255);
}
function isIPv6(value){
 if(!String(value||'').includes(':')||/[\s/%?#@]/.test(value))return false;
 try{new URL('http://['+value+']/');return true;}catch(_){return false;}
}
function parseMtaServerAddress(raw,portInput){
 let value=String(raw??'').trim();
 if(!value)invalidAddress();
 if(/^mtasa:\/\//i.test(value))value=value.replace(/^mtasa:\/\//i,'');
 else if(/^[a-z][a-z0-9+.-]*:\/\//i.test(value))throw new Error('Usa el protocolo mtasa://, no una dirección HTTP/HTTPS.');
 if(value.endsWith('/'))value=value.slice(0,-1);
 if(!value||/[\s/?#@]/.test(value))invalidAddress();
 let host=value,embeddedPort=null;
 if(value.startsWith('[')){
  const match=value.match(/^\[([0-9a-f:.]+)\](?::([0-9]{1,5}))?$/i);
  if(!match)invalidAddress();
  host=match[1];embeddedPort=match[2]?Number(match[2]):null;
 }else{
  const match=value.match(/^([0-9.]+):([0-9]{1,5})$/);
  if(match){host=match[1];embeddedPort=Number(match[2]);}
 }
 if(!isIPv4(host)&&!isIPv6(host))invalidAddress();
 const typedPort=String(portInput??'').trim();
 let separatePort=null;
 if(typedPort){
  if(!/^\d{1,5}$/.test(typedPort))throw new Error('El puerto MTA debe ser un número entero entre 1 y 65535.');
  separatePort=Number(typedPort);
 }
 const port=embeddedPort??separatePort??DEFAULT_MTA_PORT;
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('El puerto MTA debe estar entre 1 y 65535.');
 return {ip:host,port,embeddedPort,usedDefaultPort:embeddedPort===null&&separatePort===null};
}
window.DRIPX_PARSE_MTA_SERVER_ADDRESS=parseMtaServerAddress;
})();