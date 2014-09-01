"use strict";(function(){var e=this,r=e.syscmdparser,t=function(e){return e instanceof t?e:this instanceof t?void(this._wrapped=e):new t(e)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=t),exports.syscmdparser=t):e.syscmdparser=t;var a="undefined"!=typeof require,s=e._;if("undefined"==typeof s){if(!a)throw new Error("syscmdparser requires underscore, see http://underscorejs.org");s=require("underscore")}var n=function(e){if(0===e.length)return null;for(var r={},t=0,a=0;a<e.length;a++)(e[a]<r.min||void 0===r.min)&&(r.min=e[a]),(e[a]>r.max||void 0===r.max)&&(r.max=e[a]),t+=e[a];r.mean=t/e.length;for(var s=0,a=0;a<e.length;a++)s+=Math.pow(e[a]-r.mean,2);r.variance=s/e.length,r.std_dev=Math.sqrt(r.variance);var n=e.slice().sort();if(n.length%2===1)r.median=n[(n.length-1)/2];else{var i=n[n.length/2-1],o=n[n.length/2];r.median=(i+o)/2}return r},i="winnt",o="android",l="linux",p="darwin",c={};c.hostname=function(e){return e?e.trim():""},c.getprop=function(e,r,t){if(t===o)return e?e.trim():"";throw new Error("syscmdparser 'getprop' not available on '"+t+"'")},c.vm_stat=function(e,r,t){if(t!==p)throw new Error("syscmdparser 'vm_stat' not available on '"+t+"'");for(var a=(e?e.trim():"").split("\n"),s=a[0].trim().replace(/\s+/g," ").split(" "),n={pagesize:parseInt(s[7])},i=1;i<a.length;i++){s=a[i].trim().replace(/\s+/g," ").split(": ");var o=s[0].replace(/"/gi,"").replace(/ /gi,"_").toLowerCase();n[o]=parseInt(s[1].replace(/\./gi,""))}return n},c.cat=function(e,r){function t(e){var r=[],t=255&e;0>t&&(t&=255+1);var a=r.push(t);return t=(65280&e)>>8,0>t&&(t&=65535+1),a=r.push(t),t=(16711680&e)>>16,0>t&&(t&=16777215+1),a=r.push(t),t=(4278190080&e)>>24,0>t&&(t&=4294967295+1),a=r.push(t),r.join(".")}var a={srcfile:r[1]},n=(e?e.trim():"").split("\n");switch(r[1]){case"/etc/resolv.conf":a.nameservers=[];for(var i=0;i<n.length;i++)if(!(0===n[i].indexOf("#")||n[i].length<=0)){var o=n[i].trim().replace(/\s+/g," ").split(" ");"domain"==o[0]?a.domain=o.splice(1):"search"==o[0]?a.search=o.splice(1):"nameserver"==o[0]&&a.nameservers.push(o[1])}break;case"/proc/net/route":a.routes=[];for(var l=n[0].toLowerCase().trim().replace(/\s+/g," ").split(" "),i=1;i<n.length;i++){var o=n[i].trim().replace(/\s+/g," ").split(" "),p={};s.each(l,function(e,r){switch(e){case"destination":case"gateway":case"mask":p[e]=t(parseInt(o[r],16));break;case"iface":case"flags":p[e]=o[r];break;default:p[e]=parseInt(o[r])}}),a.routes.push(p)}break;case"/proc/net/wireless":a.ifaces={};for(var i=0;i<n.length;i++)if(!(n[i].indexOf("|")>=0||n[i].length<=0)){var o=n[i].trim().replace(/\s+/g," ").split(" ");a.ifaces[o[0].replace("/:/","")]={link:parseInt(o[2]),signal:parseInt(o[3]),noise:parseInt(o[4])}}break;case"/proc/net/dev":a.ifaces={};for(var i=0;i<n.length;i++)if(!(n[i].indexOf("|")>=0||n[i].length<=0)){var o=n[i].trim().replace(/\s+/g," ").split(" ");a.ifaces[o[0].replace("/:/","")]={rx:{bytes:parseInt(o[1]),packets:parseInt(o[2]),errs:parseInt(o[3]),drop:parseInt(o[4])},tx:{bytes:parseInt(o[8]),packets:parseInt(o[9]),errs:parseInt(o[10]),drop:parseInt(o[11])}}}break;case"/proc/net/tcp":case"/proc/net/tcp6":case"/proc/net/udp":case"/proc/net/udp6":break;case"/proc/meminfo":case"/proc/net/snmp6":for(var i=0;i<n.length;i++)if(!(0===n[i].indexOf("#")||n[i].length<=0)){var o=n[i].trim().replace(/\s+/g," ").split(" ");a[o[0].replace(/:/gi,"").toLowerCase()]=parseInt(o[1])}break;case"/proc/net/netstat":case"/proc/net/snmp":for(var c=void 0,l=void 0,i=0;i<n.length;i++)if(!(0===n[i].indexOf("#")||n[i].length<=0)){var o=n[i].trim().replace(/\s+/g," ").split(" ");c&&c===o[0]?(c=c.replace(/:/gi,"").toLowerCase(),a[c]={},s.each(l,function(e,r){a[c][e.toLowerCase()]=parseInt(o[r+1])}),c=void 0):(c=o[0],l=o.splice(1))}break;default:throw new Error("syscmdparser does not support 'cat "+r[1]+"'")}return a},c.netsh=function(e,r,t){if(t!==i)throw new Error("syscmdparser 'netsh' not available on '"+t+"'")},c.ifconfig=function(e,r,t){var a={};switch(t){case l:for(var n=(e?e.trim():"").trim().split("\n\n"),i=0;i<n.length;i++){var o=n[i].trim().replace(/\s+/g," ");if(o){var c={},d={name:/^([\w\d]+) /gi,type:/encap:(\w+) /gi,mac:/hwaddr ([\w:\d]+) /gi,ipv4:/inet addr:([\.\d]+) /gi,ipv6:/inet6 addr: ([\:\d\w]+\/\d+) /gi,broadcast:/bcast:([\.\d]+) /gi,mask:/mask:([\.\d]+) /gi,mtu:/mtu:(\d+) /gi,txqueuelen:/txqueuelen:(\d+) /gi};s.each(d,function(e,r){console.log(r);for(var t=null;null!==(t=e.exec(o));)c[r]=t[1],"mtu"===r||"txqueuelen"===r?c[r]=parseInt(t[1]):"type"===r&&(c[r]=t[1].toLowerCase())}),c.name&&(a[c.name]=c)}}break;case p:break;default:throw new Error("syscmdparser 'ifconfig' not available on '"+t+"'")}return a},c.ipconfig=function(){},c.iwconfig=function(){},c.airport=function(e,r,t){if(t!==p)throw new Error("syscmdparser 'airport' not available on '"+t+"'");if(!s.contains(r,"-I")&&!s.contains(r,"-s"))throw new Error("syscmdparser 'airport' -I or -s required");var a={},n=(e?e.trim():"").split("\n");if(s.contains(r,"-I"))for(var i=0;i<n.length;i++){var o=n[i].trim().replace(/\s+/g," ").split(": "),l=o[0].replace(/"/gi,"").toLowerCase();switch(l){case"agrctlrssi":case"agrctlnoise":case"agrextrssi":case"agrextnoise":case"lasttxrate":case"maxrate":case"lastassocstatus":case"mcs":case"channel":a[l]=parseInt(o[1]);break;default:a[l]=o[1]}}else{a=[];var c=n[0].trim().toLowerCase().replace(/\s+/g," ").split(" ");c.pop();for(var i=1;i<n.length;i++){var o=n[i].trim(),d={};s.each(c,function(e,r){switch(e){case"rssi":d[e]=parseInt(o[r]);break;default:d[e]=o[r]}}),a.push(d)}}return a},c.ip=function(e,r){for(var t=void 0,a=(e?e.trim():"").split("\n"),n=1,i=r[n];i.indexOf("-")>=0;)n+=1,"-f"===i&&(n+=1),i=r[n];switch(i){case"neigh":t=[];for(var o=0;o<a.length;o++){var l=a[o].trim().replace(/\s+/g," ").split(" ");6===l.length&&t.push({address:l[0],iface:l[2],mac:l[4]})}break;case"addr":t={};for(var o=0;o<a.length;o++){var p=a[o].trim().replace(/\s+/g," ");if(p){var c=/^\d+: ([\w\d]+) /gi,d=c.exec(p);d&&(d=d[1]);var m=t[d]||{name:d},u={ipv4:/inet ([\.\d]+)\/(\d+) /gi,ipv6:/inet6 ([\:\d\w]+\/\d+) /gi,broadcast:/brd ([\.\d]+) /gi};s.each(u,function(e,r){for(var t=null;null!==(t=e.exec(p));)if(m[r]=t[1],"ipv4"===r&&t[2]){var a=parseInt(t[2]);m.mask="";for(var s="",n=0;32>=n;n++)8===s.length&&(m.mask+=parseInt(s,2)+".",s=""),s+=n>=a?"0":"1";m.mask=m.mask.slice(0,-1)}}),t[m.name]=m}}break;case"link":t={};for(var o=0;o<a.length;o++){var p=a[o].trim().replace(/\s+/g," ");if(p){var m={},u={name:/^\d+: ([\w\d]+): /gi,type:/link\/(\w+) /gi,mac:/link\/\w+ ([\w:\d]+) /gi,mtu:/mtu (\d+) /gi,qdisc:/qdisc ([\w_]+) /gi,txqueuelen:/qlen (\d+)\\ /gi};s.each(u,function(e,r){for(var t=null;null!==(t=e.exec(p));)m[r]=t[1],"mtu"===r||"txqueuelen"===r?m[r]=parseInt(t[1]):"type"===r&&(m[r]=t[1].toLowerCase())}),m.name&&(t[m.name]=m)}}break;default:throw new Error("syscmdparser 'ip' unknown object: "+i)}return t},c.route=function(e){for(var r=[],t=(e?e.trim():"").split("\n"),a=void 0,n=0;n<t.length;n++){var i=t[n].trim().toLowerCase().replace(/\s+/g," ").split(" ");if("destination"===i[0])a=i.splice(0);else if(a&&a.length>=i.length){var o={};s.each(a,function(e,r){e="netif"===e?"iface":e,r<i.length&&(o[e]=i[r])}),r.push(o)}else a=void 0}return r},c.netstat=function(e,r,t){var a=void 0,n=(e?e.trim():"").split("\n");if(2===s.intersection(r,["-b","-i"]).length&&t===p){a={};for(var i=1;i<n.length;i++){var o=n[i].trim().replace(/\s+/g," ").split(" ");11===o.length&&(a[o[0]]={rx:{packets:parseInt(o[4]),bytes:parseInt(o[6])},tx:{packets:parseInt(o[7]),bytes:parseInt(o[9])}})}}else{if(2!==s.intersection(r,["-r","-n"]).length)throw new Error("syscmdparser 'netstat' unknown options: "+r.splice(1).join(" "));a=[];for(var l=void 0,i=0;i<n.length;i++){var o=n[i].trim().toLowerCase().replace(/\s+/g," ").split(" ");if("destination"===o[0])l=o.splice(0);else if(l&&l.length>=o.length){var c={};s.each(l,function(e,r){e="netif"===e?"iface":e,r<o.length&&(c[e]=o[r])}),a.push(c)}else l=void 0}}return a},c.top=function(e,r,t){var a={tasks:{total:null,running:null,sleeping:null},loadavg:{onemin:null,fivemin:null,fifteenmin:null},cpu:{user:null,system:null,idle:null},memory:{total:null,used:null,free:null}},s=(e?e.trim():"").split("\n");switch(t){case o:for(var n=0;n<s.length;n++){var i=s[n].trim().replace(/\s+/g," ").split(" ");"System"===i[2]?(a.cpu.user=parseFloat(i[1].replace("%,","")),a.cpu.system=parseFloat(i[3].replace("%,","")),a.cpu.idle=100-(a.cpu.user+a.cpu.system)):"Nice"===i[3]&&(a.tasks.total=parseInt(i[21]),a.tasks.sleeping=parseInt(i[10]),a.tasks.running=a.tasks.total-a.tasks.sleeping)}break;case l:for(var n=0;n<s.length;n++){var i=s[n].trim().replace(/\s+/g," ").split(" ");switch(i[0]){case"top":for(var c=1;c<i.length;c++)if("average:"==i[c]){a.loadavg.onemin=parseFloat(i[c+1].replace(",","")),a.loadavg.fivemin=parseFloat(i[c+2].replace(",","")),a.loadavg.fifteenmin=parseFloat(i[c+3].replace(",",""));break}case"Tasks:":a.tasks.total=parseInt(i[1]),a.tasks.running=parseInt(i[3]),a.tasks.sleeping=parseInt(i[5]);break;case"%Cpu(s):":a.cpu.user=parseFloat(i[1]),a.cpu.system=parseFloat(i[3]),a.cpu.idle=parseFloat(i[7]);break;case"KiB":"Mem:"==i[1]&&(a.memory.total=parseInt(i[2]),a.memory.used=parseInt(i[4]),a.memory.free=parseInt(i[6]),a.memory.unit="KiB")}}break;case p:for(var n=0;n<s.length;n++){var i=s[n].trim().replace(/\s+/g," ").split(" ");switch(i[0]){case"Processes:":a.tasks.total=parseInt(i[1]),a.tasks.running=parseInt(i[3]),a.tasks.sleeping=parseInt(i[7]);break;case"Load":a.loadavg.onemin=parseFloat(i[2].replace(",","")),a.loadavg.fivemin=parseFloat(i[3].replace(",","")),a.loadavg.fifteenmin=parseFloat(i[4].replace(",",""));break;case"CPU":a.cpu.user=parseFloat(i[2].replace("%","")),a.cpu.system=parseFloat(i[4].replace("%","")),a.cpu.idle=parseFloat(i[6].replace("%",""));break;case"PhysMem:":a.memory.used=parseInt(i[1].replace("M","")),a.memory.free=parseInt(i[5].replace("M","")),a.memory.total=a.memory.used+a.memory.free,a.memory.unit="M"}}}return a},c.arp=function(e,r,t){var a=(e?e.trim():"").split("\n"),s=[];switch(t){case l:case o:for(var n=0;n<a.length;n++){var c=a[n].trim().replace(/\s+/g," ").split(" ");s.push({hostname:c[0],address:c[1].replace(/\(|\)/gi,""),mac:c[3],type:c[4].replace(/\[|\]/gi,""),iface:c[6]})}break;case p:for(var n=0;n<a.length;n++){var c=a[n].trim().replace(/\s+/g," ").split(" ");s.push({hostname:c[0],address:c[1].replace(/\(|\)/gi,""),mac:c[3],iface:c[5],type:c[7].replace(/\[|\]/gi,"")})}break;case i:}return s},c.nslookup=function(e,r){for(var t=(e?e.trim():"").split("\n"),a={query:r[r.length-1],server:void 0,answers:[]},s={name:void 0,address:void 0},n=0;n<t.length;n++){var i=t[n].trim().toLowerCase().replace(/\s+/g," ").split(" ");"server:"===i[0]?a.server=i[1]:"name:"===i[0]?(s.name&&(a.answers.push(s),s={name:void 0,address:void 0}),s.name=i[1]):"address:"===i[0]&&s.name&&(s.address=i[1])}return s.name&&a.answers.push(s),a},c.ping=function(e,r,t){var a=(e?e.trim():"").split("\n"),s={dst:r[r.length-1],dst_ip:void 0,count:0,lost:0,bytes:0,ttl:void 0,rtt:[],stats:void 0,time_exceeded_from:void 0};switch(t){case l:case o:for(var c=0;c<r.length;)switch(r[c]){case"-c":s.count=parseInt(r[c+1]),c+=2;break;case"-t":s.ttl=parseInt(r[c+1]),c+=2;break;default:c+=1}for(var d=0;d<a.length;d++){var m=a[d].trim().replace(/\s+/g," ").split(" ");if(a[d].toLowerCase().indexOf("time to live exceeded")>=0){s.time_exceeded_from=m[2].replace(/\(|\)|:/gi,"");break}if("PING"===m[0])s.dst_ip=m[2].replace(/\(|\)|:/gi,""),s.bytes=parseInt(m[3].indexOf("(")<0?m[3]:m[3].substring(0,m[3].indexOf("(")));else if("bytes"===m[1])for(var u=2;u<m.length;u++)if(0===m[u].indexOf("time=")){var f=m[u].split("=");s.rtt.push(parseFloat(f[1]))}}s.lost=s.count-s.rtt.length;break;case p:for(var c=0;c<r.length;)switch(r[c]){case"-c":s.count=parseInt(r[c+1]),c+=2;break;case"-m":s.ttl=parseInt(r[c+1]),c+=2;break;default:c+=1}for(var d=0;d<a.length;d++){var m=a[d].trim().replace(/\s+/g," ").split(" ");if(a[d].toLowerCase().indexOf("time to live exceeded")>=0){s.time_exceeded_from=m[3].replace(/:/gi,"");break}if("PING"===m[0])s.dst_ip=m[2].replace(/\(|\)|:/gi,""),s.bytes=parseInt(m[3]);else if("bytes"===m[1])for(var u=2;u<m.length;u++)if(0===m[u].indexOf("time=")){var f=m[u].split("=");s.rtt.push(parseFloat(f[1]))}}s.lost=s.count-s.rtt.length;break;case i:}return s.stats=n(s.rtt),s},c.fping=function(e,r){if(!s.contains(r,"-C"))throw new Error("syscmdparser fping -C required");for(var t={dst:r[r.length-1],count:0,lost:0,bytes:56,ttl:void 0,rtt:[],stats:void 0,time_exceeded_from:void 0},a=0;a<r.length;)switch(r[a]){case"-C":t.count=parseInt(r[a+1]),a+=2;break;case"-H":t.ttl=parseInt(r[a+1]),a+=2;break;case"-b":t.bytes=parseInt(r[a+1]),a+=2;break;default:a+=1}for(var i=(e?e.trim():"").split("\n"),o=0;o<i.length;o++){var l=i[o].trim().replace(/\s+/g," ").split(" ");if(i[o].toLowerCase().indexOf("time exceeded")>=0){t.time_exceeded_from=l[4];break}/\d+\.?\d*/.test(l[5])&&t.rtt.push(parseFloat(l[5]))}return t.stats=n(t.rtt),t},c.traceroute=function(e,r,t){var a=(e?e.trim():"").split("\n"),s={dst:r[r.length-1],nqueries:3,hops:{}};switch(t){case l:case o:case p:for(var n=0;n<r.length;)switch(r[n]){case"-q":s.nqueries=parseInt(r[n+1]),n+=2;break;default:n+=1}for(var c={},d=-1,m=0;m<a.length;m++){var u=a[m].trim();if(u&&0!==u.length&&!(u.indexOf("traceroute")>=0)){var f=u.replace(/\s+/g," ").replace(/\sms/g,"").split(" ");if(/^\d{1,2} /.test(u)&&(d>0&&(s.hops[d]=c),c={},d=parseInt(f[0].trim()),f=f.slice(1)),"*"==f[0])c["*"]={hostname:void 0,rtt:[],missed:s.nqueries};else{var v=f[1].replace(/\(|\)/gi,"");c[v]={hostname:f[0],rtt:[],missed:0};for(var n=2;n<f.length;)"*"===f[n]?(c[v].missed+=1,n+=1):/\(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\)/.test(f[n+1])?(v=f[n+1].replace(/\(|\)/gi,""),c[v]={hostname:f[n],rtt:[],missed:0},n+=2):(c[v].rtt.push(parseFloat(f[n])),n+=1)}}}d>0&&(s.hops[d]=c);break;case i:for(var m=3;m<a.length-2;m++){var u=a[m].replace(/\s+/g," ").replace(/\sms/g,"");if(""!=u.trim()){var f=u.trim().split(" "),h=new Hop;if(h.id=f[0],6==f.length?(h.host=f[4],h.ip=f[5].replace(/\[|\]/gi,"")):5==f.length&&(h.ip=f[4]),h.ip){h.missed=0,h.rtt=[];for(var g=1;3>=g;g++)"*"===f[g]?h.missed=h.missed+1:h.rtt.push(parseFloat(f[g].replace(/</g,"")))}traceroute.hop.push(h)}}}return s},c.mtr=function(e,r){if(!s.contains(r,"--raw"))throw new Error("syscmdparser mtr --raw required");for(var t={dst:r[r.length-1],nqueries:0,hops:{}},a=0;a<r.length;)switch(r[a]){case"-c":t.nqueries=parseInt(r[a+1]),a+=2;break;default:a+=1}for(var n=(e?e.trim():"").split("\n"),i=0;i<n.length;i++){var o=n[i].trim().split(" "),l=parseInt(o[1])+1;switch(o[0]){case"h":t.hops[l]={},t.hops[l][o[2]]={hostname:void 0,missed:t.nqueries,rtt:[]};break;case"p":var p=t.hops[l];p=p[s.keys(p)[0]],p.missed-=1,p.rtt.push(parseInt(o[2])/1e3);break;case"d":var p=t.hops[l]?t.hops[l]:t.hops[l-1];p=p[s.keys(p)[0]],p.hostname=o[2]}}return t},c.iperf=function(e,r){var t=s.indexOf(r,"-y");if(0>t||"j"!==r[t+1].toLowerCase()&&"c"!==r[t+1].toLowerCase())throw new Error("syscmdparser iperf -Y [j|c] required");for(var a="c"===r[t+1].toLowerCase(),n={header:{test:{proto:"tcp",duration:10,bytes:void 0,rate:void 0,mode:"normal"},role:void 0,local_host:void 0,remote_host:void 0},local:{recv:void 0,send:void 0},remote:{recv:void 0,send:void 0}},t=0;t<r.length;)switch(r[t]){case"-c":n.header.role="client",t+=1;break;case"-s":n.header.role="server",t+=1;break;case"-t":n.header.test.duration=parseInt(r[t+1]),t+=2;break;case"-b":n.header.test.rate=r[t+1],t+=2;break;case"-n":n.header.test.bytes=r[t+1],t+=2;break;case"-u":n.header.test.proto="udp",t+=1;break;case"-d":n.header.test.mode="dual",t+=1;break;case"-r":n.header.test.mode="tradeoff",t+=1;break;case"-E":n.header.test.mode="reverse",t+=1;break;default:t+=1}var i=function(e){if(e.length<14)return{timein:e,timesec:parseInt(e)};var r=new Date(parseInt(e.substring(0,4)),parseInt(e.substring(4,6)),parseInt(e.substring(6,8)),parseInt(e.substring(8,10)),parseInt(e.substring(10,12)),parseInt(e.substring(12,14)),0);return{time:r.toJSON(),timemsec:r.getTime(),timein:e}},o=e.split("\n");if(a){var l=o[0].split(",");n.header.local_host=l[1],n.header.remote_host=l[3];for(var p={local_port:parseInt(l[2]),remote_port:parseInt(l[4]),intervals:[],total:void 0},c=0;c<o.length;c++){l=o[c].split(",");var d={timestamp:i(l[0]),startTime:parseFloat(l[6].split("-")[0]),endTime:parseFloat(l[6].split("-")[1]),bytes:parseFloat(l[7]),rate:parseFloat(l[8])};l.length>10&&s.extend(d,{jitter:parseFloat(l[9]),errorCnt:parseInt(l[10]),dgramCnt:parseInt(l[11]),errorRate:parseFloat(l[12]),outOfOrder:parseFloat(l[13])}),d.bytesK=d.bytes/1024,d.bytesM=d.bytes/1024/1024,d.rate=d.bytes/(d.endTime-d.startTime),d.ratebit=8*d.rate,d.rateKbit=d.ratebit*(1/1e3),d.rateMbit=d.ratebit*(1/1e3/1e3);var m=parseInt(l[2]),u=parseInt(l[4]);(m!==p.local_port||u!==p.remote_port)&&(p.total=p.intervals.pop(),"client"===n.header.role?n.local.send||"reverse"===n.header.test.mode?m===p.remote_port&&u===p.local_port?n.remote.recv=p:n.local.recv=p:n.local.send=p:n.local.recv||"reverse"===n.hearder.test.mode?n.local.send?n.remote.recv=p:n.local.send=p:n.local.recv=p,p={local_port:m,remote_port:u,intervals:[],total:void 0}),p.intervals.push(d)}p.total=p.intervals.pop(),"client"===n.header.role?n.local.send||"reverse"===n.header.test.mode?"normal"===n.header.test.mode?n.remote.recv=p:n.local.recv=p:n.local.send=p:n.local.recv||"reverse"===n.header.test.mode?n.local.send?n.remote.recv=p:n.local.send=p:n.local.recv=p}return n},t.parse=function(e,r,t,a,n){if(!a||!n)throw new Error("syscmdparser missing command or os");if(!m(n))throw new Error("syscmdparser does not yet support '"+n+"' OS");s.isArray(a)||(a=a.split(" "));var i=a[0];if(i.indexOf("\\")>=0&&(i=i.split("\\").splice(-1)[0]),i.indexOf("/")>=0&&(i=i.split("/").splice(-1)[0]),!d(i))throw new Error("syscmdparser does not yet support '"+a[0]+"' command");var u={ts:Date.now(),cmd:i,cmdline:a.join(" "),os:n,stderr:t?t.trim():"",stdout:r?r.trim().substring(0,32):"",result:void 0};return e&&(u.error=e.code||e,"ping"===i&&(2==u.error&&n===p||1==u.error&&(n===l||n===o))?u.error=void 0:"fping"===i&&1==u.error&&(u.error=void 0,r=t)),u.error||(r=r?r.trim():"",u.result=c[i](r,a,n)),u},t.getSupportedCmds=function(){return s.keys(c)};var d=t.isCmdSupported=function(e){return c[e]&&s.isFunction(c[e])};t.getSupportedOSs=function(){return[o,l,p]};var m=t.isOSSupported=function(e){return e===o||e===l||e===p};t.noConflict=function(){return e.syscmdparser=r,t}}).call(this);
//# sourceMappingURL=syscmdparser-min.map