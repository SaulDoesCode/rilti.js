/**
 * Modified and Reduced by Saul van der Walt (SaulDoesCode)
 * Based on vanilla-tilt.js by Șandor Sergiu (micku7zu)
 * Original idea: https://github.com/gijsroge/tilt.js
 * MIT License.
 *
 * Code Usage:  Tilt( ElementOrSelector, Settings = {} );
 * HTML Usage: <div tilt></div> or <div tilt="glare:1"></div>
 */
{
  /* global rilti cancelAnimationFrame requestAnimationFrame */
  const NULL = null
  const {isNode, isNodeList, isStr, domfn: {css}, dom: {div, queryAll}, each, extend, on} = rilti

  const isSettingTrue = setting => setting === '' || setting === true || setting === 1

  const defaultSettings = {
    reverse: false,
    max: 35,
    perspective: 1000,
    easing: 'cubic-bezier(.03,.98,.52,.99)',
    scale: '1',
    speed: '300',
    transition: true,
    axis: NULL,
    glare: false,
    'max-glare': 1,
    reset: true
  }

  var Tilt = (element, settings = defaultSettings) => {
    if (isStr(element)) element = queryAll(element)

    if (settings !== defaultSettings) extend(settings, defaultSettings)

    if (!isNode(element)) {
      if (isNodeList(element)) return each(element, el => Tilt(el, settings))
      throw new TypeError(`Tilt init error: ${element} isn't a Node.`)
    }

    if (element.tiltOff) element.tiltOff()

    let width = NULL
    let height = NULL
    let left = NULL
    let top = NULL
    let transitionTimeout = NULL
    let event
    let updateCall

    const reverse = settings.reverse ? -1 : 1
    const glare = isSettingTrue(settings.glare)

    if (glare) {
      var glareElement
      var glareElementWrapper = div({
        class: 'js-tilt-glare',
        css: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        },
        render: element
      },
        glareElement = div({
          class: 'js-tilt-glare-inner',
          css: {
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
        })
      )

      var onWindowResize = on(window, 'resize', () => {
        const offset = `${element.offsetWidth * 2}`
        css(glareElement, {width: offset, height: offset})
      })
    }

    const setTransition = () => {
      clearTimeout(transitionTimeout)
      element.style.transition = settings.speed + 'ms ' + settings.easing
      if (glare) glareElement.style.transition = `opacity ${settings.speed}ms ${settings.easing}`

      transitionTimeout = setTimeout(() => {
        element.style.transition = ''
        if (glare) glareElement.style.transition = ''
      }, settings.speed)
    }

    const update = () => {
      let x = (event.clientX - left) / width
      let y = (event.clientY - top) / height

      x = Math.min(Math.max(x, 0), 1)
      y = Math.min(Math.max(y, 0), 1)

      let tiltX = (reverse * (settings.max / 2 - x * settings.max)).toFixed(2)
      let tiltY = (reverse * (y * settings.max - settings.max / 2)).toFixed(2)
      let angle = Math.atan2(event.clientX - (left + width / 2), -(event.clientY - (top + height / 2))) * (180 / Math.PI)
      // let percentageX = x * 100
      let percentageY = y * 100

      element.style.transform = `perspective(${settings.perspective}px)
          rotateX(${settings.axis === 'x' ? 0 : tiltY}deg)
          rotateY(${settings.axis === 'y' ? 0 : tiltX}deg)
          scale3d(${settings.scale},${settings.scale},${settings.scale})`

      glare && css(glareElement, {
        transform: `rotate(${angle}deg) translate(-50%, -50%)`,
        opacity: `${percentageY * settings['max-glare'] / 100}`
      })

      updateCall = NULL
    }

    const onMouseEnter = on(element, 'mouseenter', () => {
      const rect = element.getBoundingClientRect()

      width = element.offsetWidth
      height = element.offsetHeight
      left = rect.left
      top = rect.top
      element.style.willChange = 'transform'
      setTransition()
    })

    const onMouseMove = on(element, 'mousemove', evt => {
      if (updateCall !== NULL) cancelAnimationFrame(updateCall)
      event = evt
      updateCall = requestAnimationFrame(update)
    })

    const onMouseLeave = on(element, 'mouseleave', () => {
      setTransition()
      if (settings.reset) {
        requestAnimationFrame(() => {
          event = {
            pageX: left + width / 2,
            pageY: top + height / 2
          }
          element.style.transform = `perspective(${settings.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
        })

        glare && css(glareElement, {
          transform: 'rotate(180deg) translate(-50%, -50%)',
          opacity: '0'
        })
      }
    })

    element.tiltOff = () => {
      onMouseEnter.off()
      onMouseMove.off()
      onMouseLeave.off()
      if (glare) {
        onWindowResize.off()
        glareElementWrapper.remove()
      }
      if (updateCall !== NULL) cancelAnimationFrame(updateCall)
      delete element.tiltOff
      return element
    }
    return element
  }

  const settingDecoder = (val, settings = {}) => {
    if (isStr(val)) {
      each(val.split(';'), setting => {
        setting = setting.split(':')
        settings[setting[0]] = setting[1] === 'true' ? true : setting[1] === 'false' ? false : setting[1]
      })
    }
    return settings
  }

  rilti.directive('tilt', {
    init: (el, val) => Tilt(el, settingDecoder(val)),
    update: (el, val) => Tilt(el, settingDecoder(val)),
    destroy: el => el.tiltOff()
  })
}
