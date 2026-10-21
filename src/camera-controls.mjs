export function cameraDirection(device) {
    if(/front|前置/i.test(device?.label || ''))return 'user';
    if(/back|rear|environment|后置|後置|背面/i.test(device?.label || ''))return 'environment';
    try{const modes=device?.getCapabilities?.().facingMode;if(modes?.length===1)return modes[0];}catch{}
    return null;
}

export function sameDirectionDevices(devices, settings) {
    const current=devices.find(d=>d.deviceId===settings.deviceId);
    const direction=settings.facingMode || cameraDirection(current);
    if(!direction || !devices.some(d=>cameraDirection(d)))return devices;
    return devices.filter(d=>d.deviceId===settings.deviceId || cameraDirection(d)===direction);
}

export const cameraIcons={
    flip:'<path d="M4 8a9 9 0 0 1 15-3l2 2M21 3v4h-4M20 16a9 9 0 0 1-15 3l-2-2M3 21v-4h4"/><rect x="7" y="8" width="10" height="8" rx="2"/><circle cx="12" cy="12" r="2"/>',
    switch:'<path d="M4 8h16l-4-4m4 12H4l4 4"/>',
    stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>'
};
export function setCameraIcon(button,icon,label){
    button.classList.add('camera-icon-button');
    button.dataset.cameraIcon=icon;
    button.title=label;button.setAttribute('aria-label',label);
    button.innerHTML=`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cameraIcons[icon]}</svg>`;
}

// Labels are hints only. Never guess lens roles from enumeration order or camera IDs.
export function preferredRearLens(devices) {
    const rear=devices.filter(d=>/back|rear|environment|后置|後置|背面/i.test(d.label) && !/front|user|前置/i.test(d.label));
    return rear.find(d=>/ultra[\s_-]*wide|ultrawide|超广|超廣/i.test(d.label))
        || rear.find(d=>/wide|广角|廣角|main|主摄|主攝/i.test(d.label) && !/tele|长焦|長焦/i.test(d.label))
        || null;
}

export async function setCameraZoom(track, value) {
    // A resolved advanced constraint can have been silently skipped. Verify it.
    await track.applyConstraints({...track.getConstraints?.(),zoom:{exact:value}});
    const actual=track.getSettings().zoom;
    if(!Number.isFinite(actual) || Math.abs(actual-value)>0.001)throw Error('Camera zoom was not applied');
    return actual;
}

// Only use zoom reported by the physical track; CSS scaling cannot widen capture.
export async function useWidestZoom(track) {
    let zoom;
    try { zoom = track.getCapabilities?.().zoom; } catch { return null; }
    if (!zoom || !Number.isFinite(zoom.min) || !Number.isFinite(zoom.max) || zoom.max <= zoom.min) return null;
    try {
        await setCameraZoom(track,zoom.min);
        return zoom;
    } catch { return null; }
}

export function createCameraControls(hosts, onSelect) {
    const controls=hosts.map(host=>{
        const panel=document.createElement('div');
        panel.className='camera-controls';panel.hidden=true;
        panel.innerHTML='<label><span>Camera lens</span><select aria-label="Camera lens"></select></label><label class="camera-zoom"><span>Camera zoom</span><input type="range" aria-label="Camera zoom"><output></output></label><small class="camera-range-note"></small>';
        host.append(panel);
        const select=panel.querySelector('select');
        select.onchange=()=>onSelect(select.value);
        return {panel,select,zoom:panel.querySelector('.camera-zoom'),input:panel.querySelector('input'),output:panel.querySelector('output'),note:panel.querySelector('small')};
    });
    let generation=0;
    function reset(){generation++;controls.forEach(c=>{c.panel.hidden=true;c.input.onchange=null;});}
    async function configure(track, devices) {
        const token=++generation;
        const range=await useWidestZoom(track);
        if(token!==generation || track.readyState==='ended')return;
        const sync=()=>controls.forEach(c=>{
            const value=track.getSettings().zoom ?? range?.min;
            if(Number.isFinite(value)){c.input.value=value;c.output.textContent=Number(value).toFixed(2)+'×';}
        });
        devices=sameDirectionDevices(devices,track.getSettings());
        for(const c of controls){
            c.select.replaceChildren(...devices.map((device,i)=>{
                const option=document.createElement('option');option.value=device.deviceId;
                option.textContent=device.label || `Camera ${i+1}`;
                option.selected=device.deviceId===track.getSettings().deviceId;return option;
            }));
            c.select.disabled=devices.length<2;
            c.zoom.hidden=!range;
            c.note.textContent=range ? 'Starts at the widest supported zoom. Choose another lens for a wider view.' : 'Zoom could not be confirmed. Try each rear lens to find the widest view.';
            if(range){
                c.input.min=range.min;c.input.max=range.max;c.input.step=range.step || 'any';
                c.input.onchange=async()=>{
                    const value=Number(c.input.value);
                    controls.forEach(x=>x.input.disabled=true);
                    try{await setCameraZoom(track,value);}catch{controls.forEach(x=>x.note.textContent='Zoom could not be confirmed. Try each rear lens to find the widest view.');}
                    finally{if(token===generation){sync();controls.forEach(x=>x.input.disabled=false);}}
                };
            }
            c.input.disabled=false;c.panel.hidden=false;
        }
        sync();
    }
    return {configure,reset};
}
