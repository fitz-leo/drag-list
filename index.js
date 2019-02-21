
function longTouch(ele, eventObj = {}) {
    const time = 200
    let touchStartTimeStamp = 0
    let touchEndTimeStamp = 0
    let timeoutId = null
    let isMove = false
    /**
     * 重复绑定事件过多 待优化 暂未想好其他方案
     */
    addEvent(ele, 'touchstart', function(e) {
        if (!e.target.className.includes('list-item')) {  // 耦合 待优化
            isMove = false
            return false
        }
        touchStartTimeStamp = e.timeStamp
        isMove = false
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
            isMove = true
            eventObj.longTouchStart && eventObj.longTouchStart(e)
            timeoutId = null
        }, time)
    })
    addEvent(ele, 'touchmove', function(e) {
        if ( isMove && timeoutId === null ) {
            e.preventDefault()
            eventObj.longTouchMove && eventObj.longTouchMove(e)
        } else {
            clearTimeout(timeoutId)
            timeoutId = false
            return false
        }
    })
    addEvent(ele, 'touchend', function(e) {
        touchEndTimeStamp = e.timeStamp
        isMove = false
        if (touchEndTimeStamp - touchStartTimeStamp < time) {
            clearTimeout(timeoutId)
            timeoutId = null
        } else {
            eventObj.longTouchEnd && eventObj.longTouchEnd(e)
        }
    })
}

function addEvent(ele, eventType, fn) {
    if (eventType === 'longTouchMove') {
        longTouch(ele, {
            longTouchMove: fn
        })
    } else if (eventType === 'longTouchStart') {
        longTouch(ele, {
            longTouchStart: fn
        })
    } else if (eventType === 'longTouchEnd') {
        longTouch(ele, {
            longTouchEnd: fn
        })
    } else {
        ele.addEventListener(eventType, fn)
    }
}

class DropList {
    constructor(ele, config = {}) {
        this.contentEle = ele 
        this.eleNodeType = 'li'
        this.childEles = [] // 列表
        this.dragEle = {} // 拖动元素
        this.originIndex = -1
        this.previousIndex = -1 
        this.currenIndex = -1
        this.showSort = config.showSort // 配置 是否显示序号
    }
    // 生成列表
    createListItemEle(arr = [], eleNode = 'li') {
        this.eleNodeType = eleNode
        let frag = document.createDocumentFragment()
        arr.forEach((item, i) => {
            let eleNodeIns = document.createElement(eleNode)
            eleNodeIns.classList.add('list-item')
            if (this.showSort) {
                eleNodeIns.innerHTML = `
                                        <div class="left flex">
                                            <div class="serial">
                                                <span>${i + 1}</span>
                                            </div>
                                            
                                        </div>
                                        ${item.content}
                                        <div class="right flex flex-column">
                                            <b class="menu">
                                                <em></em>
                                            </b>
                                        </div>
                                        ` || ''
            } else {
                eleNodeIns.innerHTML = item.content || ''
            }
            frag.appendChild(eleNodeIns)
        })
        this.contentEle.appendChild(frag)
        this._init()
    }
    _init() {
        this._bindEvent()
    }
    // 利用父节点代理子节点事件
    _bindEvent() {
        let that = this
        addEvent(this.contentEle, 'longTouchMove', function(e) {
            
            const dragEle = that.dragEle
            const touch = e.touches[0]
            const target = dragEle.target
            const cY = touch.clientY
            const presentTop = parseInt(dragEle.startTop) + (cY - dragEle.startY) // 获取当前长按元素top
            const childEles = that.childEles

            that.currenIndex = Math.ceil((presentTop - dragEle.height / 2) / dragEle.height) // 根据top计算下表
            
            if (that.currenIndex < 0) { that.currenIndex = 0 }
            if (that.currenIndex > childEles.length - 1) { that.currenIndex = childEles.length - 1 }

            if (that.previousIndex !== that.currenIndex) { // 位置发生变化

                childEles[that.currenIndex].style.transition = '.3s'

                if (that.currenIndex === that.originIndex) {  // 重复经过自身位置 取消动画  
                    childEles[that.originIndex].style.transition = ''
                }

                // 前位置大于当前移动的位置并且当前位置小于原始位置
                if (that.previousIndex  > that.currenIndex) {
                    
                    if (that.currenIndex < that.originIndex) {
                        that.__moveUp(dragEle.height)
                    } else if (that.currenIndex > that.originIndex) {
                        that.__moveDownAndUp()
                    }
                } else {
                    if (that.currenIndex < that.originIndex) {
                        that.__moveUpAndDown()
                        
                    } else if (that.currenIndex > that.originIndex) {
                        that.__moveDown(-dragEle.height)
                    }
                }

                if (that.currenIndex === that.originIndex) {
                    that._moveOirginPos(childEles[that.previousIndex])
                    that._sort(childEles[that.previousIndex], that.previousIndex + 1)
                    that._sort(childEles[that.originIndex], that.currenIndex + 1)
                }
                
                that.previousIndex = that.currenIndex
            }
            that._moveTo(target, cY - dragEle.startY)
        })
        addEvent(this.contentEle, 'longTouchStart', function(e) {
            const target = e.target

            const touch = e.touches[0]
            const eleHeight = target.clientHeight
            const startTop = target.getBoundingClientRect().top - that.contentEle.getBoundingClientRect().top
            const dragEle = that.dragEle

            that.childEles = Array.from(that.contentEle.children) // 类数组对象转数组
            that.originIndex = that._findCurrentEleIndex(target)
            that.childEles.forEach((item, index) => index !== that.originIndex ? that.addClass(item, 'disa') : that.addClass(item, 'active'))

            dragEle.height = eleHeight
            dragEle.startTop = startTop
            dragEle.startY = touch.clientY
            dragEle.target = target
            
            // 当前元素位置
            that.previousIndex = Math.ceil((parseInt(startTop) - eleHeight / 2) / eleHeight)
            that.currenIndex = that.previousIndex
            target.style.transition = `0s`
        })
        addEvent(this.contentEle, 'longTouchEnd', function(e) {
            const currentItems = that.childEles
            currentItems.forEach(item => {
                item.removeAttribute('style')
                that.removeClass(item, 'active', 'disa')
            })
            if (that.currenIndex !== that.originIndex) {
                // 移除并插入元素
                if (that.currenIndex < that.originIndex) {
                    that.dragEle.target.remove()
                    currentItems[that.previousIndex].before(that.dragEle.target)
                } else {
                    that.dragEle.target.remove()
                    currentItems[that.previousIndex].after(that.dragEle.target)
                }
            }
        })
    }
    _moveOirginPos(ele) {
        ele.style.transform = `translateY(${0}px)`
    }
    _moveTo(ele, dis) {
        ele.style.transform = `translateY(${dis}px)`
    }
    _findCurrentEleIndex(ele) {
        return Array.from(this.childEles).indexOf(ele)
    }
    _sort(ele, val) {
        const ce = ele.querySelector('.serial')
        if (ce) {
            ce.firstElementChild.innerText = val
        }
    }
    removeClass(ele, className, ...arg) {
        if (ele) {
            ele.classList.remove(className, ...arg)
        } else {
            className = ele
            this.childEles.forEach(item => item.classList.remove(className, ...arg))
        }
        return this
    }
    addClass(ele, className) {
        if (ele) {
            ele.classList.add(className)
        }
        return this
    }
    __moveDown(dis) {
        this._moveTo(this.childEles[this.currenIndex], dis )
        this._sort(this.childEles[this.originIndex], this.currenIndex + 1)
        this._sort(this.childEles[this.currenIndex], this.currenIndex)
    }
    __moveDownAndUp() {
        this._moveOirginPos(this.childEles[this.previousIndex])
        this._sort(this.childEles[this.originIndex], this.previousIndex)
        this._sort(this.childEles[this.previousIndex], this.previousIndex + 1)
    }
    __moveUp(dis) {
        this._moveTo(this.childEles[this.currenIndex], dis)
        this._sort(this.childEles[this.originIndex], this.currenIndex + 1)
        this._sort(this.childEles[this.currenIndex], this.previousIndex + 1)
    }
    __moveUpAndDown() {
        this._moveOirginPos(this.childEles[this.previousIndex])
        this._sort(this.childEles[this.originIndex], this.currenIndex + 1)
        this._sort(this.childEles[this.previousIndex], this.previousIndex + 1)
    }
    __moveOriginPos() {
        this._moveOirginPos(this.childEles[this.previousIndex])
        this._sort(this.childEles[this.previousIndex], this.previousIndex + 1)
        this._sort(this.childEles[this.originIndex], this.currenIndex + 1)
    }
}