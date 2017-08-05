{
  const {each, curry, isFunc} = rilti,
  change = 'change:';

  rilti.model = (m = {}) => {
    const data = rilti.notifier(new Map);

    if(Object.keys(m).length) each(m, (val, key) => {
      data.set(key, val);
    });

    const dataSet = data.set.bind(data),
    const dataGet = data.get.bind(data),
    const dataDelete = data.delete.bind(data),

    const previousProps = new Map;

    data.previous = prop => previousProps.get(prop);

    data.set = (prop, val) => {
      if(!previousProps.has(prop) || !data.has(prop)) data.emit('new', prop, val);
      previousProps.set(prop, val);
      dataSet(prop, val).emit(change+prop, val);
      return data;
    }

    data.get = prop => dataGet(prop);

    data.delete = prop => {
      dataDelete(prop).emit(change+prop);
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
      if(data.has(prop)) updater(dataGet(prop));
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
