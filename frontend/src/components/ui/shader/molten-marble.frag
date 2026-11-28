// Molten marble: domain-warped fbm noise layered base -> primary -> secondary -> highlight, a vignette and dither.
// Live on the ai-course-final hero. GLSL ES 1.0 (WebGL 1), run by ShaderCanvas.tsx.
// Uniforms: u_resolution, u_time, and the palette roles u_bg, u_primary, u_secondary,
// u_primarySoft, u_secondarySoft, u_highlight (set by ShaderCanvas.tsx from the palette tokens).
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_bg, u_primary, u_secondary, u_primarySoft, u_secondarySoft, u_highlight;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; } return v; }
vec3 finish(vec3 col, vec2 uv){ float vig=smoothstep(1.2,0.3,length((uv-0.5)*vec2(1.0,1.3))); col=mix(u_bg,col,0.45+0.55*vig);
  col+=(hash(gl_FragCoord.xy+fract(u_time))-0.5)/128.0; return clamp(col,0.0,1.0); }
void main(){ vec2 uv=gl_FragCoord.xy/u_resolution; vec2 p=(gl_FragCoord.xy-0.5*u_resolution)/u_resolution.y; float t=u_time*0.05;
 p*=1.6; vec2 q=vec2(fbm(p+vec2(0.0,t)), fbm(p+vec2(5.2,1.3)));
 vec2 r=vec2(fbm(p+3.0*q+vec2(1.7,9.2)+0.9*t), fbm(p+3.0*q+vec2(8.3,2.8)+0.6*t));
 float f=fbm(p+3.4*r);
 vec3 col=mix(u_bg, u_primary*0.8, smoothstep(0.1,0.6,f));
 col=mix(col, u_secondary, smoothstep(0.45,0.85,f)*smoothstep(0.2,0.8,length(q)));
 col=mix(col, u_highlight*0.95, smoothstep(0.75,1.0,f)*0.7);
 col*=0.7+0.6*smoothstep(0.1,0.9,r.x);
 float shift=smoothstep(0.1,0.9,uv.x); col=mix(col*0.6,col,shift);
 gl_FragColor=vec4(finish(col,uv),1.0); }
