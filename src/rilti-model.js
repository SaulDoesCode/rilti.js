{
  const {each} = rilti;

  rilti.model = props => {

    const syncs = new Map;

    const n = rilti.notifier({
      sync(obj, prop, key = prop) {
        if(!syncs.has(obj)) syncs.set(obj, new Map);
        syncs.get(obj).set(prop, n.on('set:'+prop, val => obj[key] = val));
        obj[key] = props[prop];
        return obj;
      },
      unsync(obj, prop) {
        if(syncs.has(obj)) {
          const syncedProps = syncs.get(obj);
          if(syncedProps.has(prop)) syncedProps.get(prop).off();
          syncedProps.delete(prop);
          if(!syncedProps.size) syncs.delete(obj);
        }
        return obj;
      },
      update(obj) {
        for (const [val,prop] of obj) n[prop] = val;
      }
    });

    Object.keys(props).forEach(prop => {
      Object.defineProperty(n, prop, {
        get() {
          n.emit('get:'+prop);
          return props[prop];
        },
        set(val) {
          n.emit('set:'+prop, (props[prop] = val));
        }
      });
    });

    return n;
  }
}
