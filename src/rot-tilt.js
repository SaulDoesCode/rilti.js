/**
 * Modified and Reduced by Saul van der Walt (SaulDoesCode)
 * Based on vanilla-tilt.js by Șandor Sergiu (micku7zu)
 * Original idea: https://github.com/gijsroge/tilt.js
 * MIT License.
 *
 * Code Usage:  Tilt( ElementOrSelector, Settings = {} );
 * HTML Usage: <div tilt></div> or <div tilt="{glare:1}"></div>
 */
{

const {isNode,isNodeList,isArr,isStr,dom,each} = rot, {on, div} = dom,
isSettingTrue = setting => setting === "" || setting === true || setting === 1,
defaultSettings = {
  reverse: false,
  max: 35,
  perspective: 1000,
  easing: "cubic-bezier(.03,.98,.52,.99)",
  scale: "1",
  speed: "300",
  transition: true,
  axis: null,
  glare: false,
  "max-glare": 1,
  reset: true
};

window.Tilt = (element, settings = {}) => {
    if(isStr(element)) element = dom.queryAll(element);
    if (!isNode(element)) {
      if(isNodeList(element)) return each(element, el => Tilt(el, settings));
      throw `Can't initialize Tilt because ${element} is not a Node.`;
    }

    element = dom(element);
    if(element.pure.tiltOff) element.pure.tiltOff();

    let width = null,
        height = null,
        left = null,
        top = null,
        transitionTimeout = null,
        event, updateCall;

    for (const property in defaultSettings) if(!(property in settings)) settings[property] = defaultSettings[property];

    const reverse = settings.reverse ? -1 : 1, glare = isSettingTrue(settings.glare);

    if (glare) {
      var glareElementWrapper = div({
          class:"js-tilt-glare",
          css: {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            overflow: "hidden"
          },
          render:element
        }),
        glareElement = div({
          class:"js-tilt-glare-inner",
          render:glareElementWrapper,
          css:{
            'position': 'absolute',
            'top': '50%',
            'left': '50%',
            'pointer-events': 'none',
            'background-image': `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)`,
            'width': `${element.offsetWidth * 2}px`,
            'height': `${element.offsetWidth * 2}px`,
            'transform': 'rotate(180deg) translate(-50%, -50%)',
            'transform-origin': '0% 0%',
            'opacity': '0'
          }
        });

      var onWindowResize = on(window, "resize", () => {
        const offset = `${element.offsetWidth * 2}`;
        glareElement.css = {width:offset,height:offset};
      });
    }

    const setTransition = () => {
      clearTimeout(transitionTimeout);
      element.style.transition = settings.speed + "ms " + settings.easing;
      if (glare) glareElement.style.transition = `opacity ${settings.speed}ms ${settings.easing}`;

      transitionTimeout = setTimeout(() => {
        element.style.transition = "";
        if (glare) glareElement.style.transition = "";
      }, settings.speed);
    }

    const update = () => {
        let x = (event.clientX - left) / width,
        y = (event.clientY - top) / height;

        x = Math.min(Math.max(x, 0), 1);
        y = Math.min(Math.max(y, 0), 1);

        let tiltX = (reverse * (settings.max / 2 - x * settings.max)).toFixed(2),
            tiltY = (reverse * (y * settings.max - settings.max / 2)).toFixed(2),
            angle = Math.atan2(event.clientX - (left + width / 2), -(event.clientY - (top + height / 2))) * (180 / Math.PI),
            percentageX = x * 100,
            percentageY = y * 100;


        element.style.transform = `perspective(${settings.perspective}px)
          rotateX(${settings.axis === "x" ? 0 : tiltY}deg)
          rotateY(${settings.axis === "y" ? 0 : tiltX}deg)
          scale3d(${settings.scale},${settings.scale},${settings.scale})`;

        glare && glareElement.css({
          transform: `rotate(${angle}deg) translate(-50%, -50%)`,
          opacity: `${percentageY * settings["max-glare"] / 100}`
        });

        updateCall = null;
    }

    const onMouseEnter = element.on("mouseenter", () => {
      const rect = element.rect;

      width = element.offsetWidth;
      height = element.offsetHeight;
      left = rect.left;
      top = rect.top;
      element.style.willChange = "transform";
      setTransition();
    });

    const onMouseMove = element.on("mousemove", evt => {
      if (updateCall !== null) cancelAnimationFrame(updateCall);
      event = evt;
      updateCall = requestAnimationFrame(update);
    });

    const onMouseLeave = element.on("mouseleave", () => {
      setTransition();
      if (settings.reset) {
        requestAnimationFrame(() => {
          event = {
            pageX: left + width / 2,
            pageY: top + height / 2
          };
          element.style.transform = `perspective(${settings.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });

        glare && glareElement.css({
          transform: 'rotate(180deg) translate(-50%, -50%)',
          opacity: '0'
        });
      }
    });

    element.pure.tiltOff = () => {
      onMouseEnter.off();
      onMouseMove.off();
      onMouseLeave.off();
      if(glare) {
        onWindowResize.off();
        glareElementWrapper.remove();
      }
      if (updateCall !== null) cancelAnimationFrame(updateCall);
      element.pure.tiltOff = null;
      return element;
    }
    return element;
}

  const settingDecoder = (val, settings = {}) => {
    isStr(val) && val.split(";").forEach(setting => {
      if(setting.includes(":")) {
        setting = setting.split(":");
        settings[setting[0]] = setting[1] === "true" ? true : setting[1] === "false" ? false : setting[1];
      }
    });
    return settings;
  }
  rot.observeAttr('tilt', {
    init:(el, val) => Tilt(el, settingDecoder(val)),
    update:(el, val) => Tilt(el, settingDecoder(val)),
    destroy:el => el.tiltOff()
  });
}
