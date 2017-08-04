{

  const {each, curry, isObj, isFunc, isEmpty} = rilti,
  change = 'change:';

  rilti.model = m => {
    const data = rilti.notifier(new Map);

    if(isObj(m) && !isEmpty(m)) each(m, (val, key) => {
      data.set(key, val);
    });

    const normalSet = data.set.bind(data);
    const normalGet = data.get.bind(data);
    const normalDelete = data.delete.bind(data);

    const previousProps = new Map;

    data.previous = prop => previousProps.get(prop);

    data.set = (prop, val) => {
      if(!previousProps.has(prop) || !data.has(prop)) data.emit('new', prop, val);
      previousProps.set(prop, val);
      normalSet(prop, val).emit(change+prop, val);
      return data;
    }

    data.get = prop => normalGet(prop);

    data.delete = prop => {
      normalDelete(prop).emit(change+prop);
      data.emit('delete', prop);
      previousProps.delete(prop);
    }

    data.update = newData => each(newData, (val, key) => data.set(key, val));

    const syncs = new Map;

    data.sync = curry((el, prop, elProp = el.value ? 'value' : 'textContent') => {
      if(!syncs.has(prop)) syncs.set(prop, new Map);

      const propListeners = syncs.get(prop);
      if(propListeners.has(el)) data.unsync(el, prop);
      if(el.notifier) el.notifier.on('destroy', () => data.unsync(el, prop));

      const updater = isFunc(elProp) ? val => elProp(el, val) : val => el[elProp] = val;
      propListeners.set(el, data.on(change+prop, updater));
      if(data.has(prop)) updater(normalGet(prop));
      return el;
    }, 2);

    data.unsync = (el, prop) => {
      if(syncs.has(prop)) {
        const propListeners = syncs.get(prop);
        if(propListeners.has(el)) {
            const {off} = propListeners.get(el);
            if(off) off();
            propListeners.delete(el);
        }
        if(!propListeners.size) syncs.delete(prop);
      }
      return el;
    }

    return data;
  }
}
