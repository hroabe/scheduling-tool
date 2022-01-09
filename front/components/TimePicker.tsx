import * as React from 'react'
import { useState } from 'react';
import { NumberInput, NumberInputField,
         NumberIncrementStepper, NumberDecrementStepper, NumberInputStepper,
         Slider, SliderTrack, Flex, SliderThumb,}  from "@chakra-ui/react"

// 時間選択コンポーネント

export interface TimePickerProps  {
  initialHour: number // 初期選択(時)
  initialMinute: number　// 初期選択(分)
  sliderStep: number // スライダー1ステップに対応する変化量(分)
  limitMaxHour: number // 上限(時)
  limitMaxMinute: number // 上限(分)
  limitMinHour: number // 下限(時)
  limitMinMinute: number // 下限(分)
  onTimeChange?: (hour: number, minute: number) => void // 時間が変更されたときのコールバック関数
}

const TimePicker = (props: TimePickerProps) => {
  const [value, setValue] = useState(props.initialHour*60)
  const [hour, setHour] = useState(props.initialHour)
  const [minute, setMinute] = useState(props.initialMinute)

  const setNewtime = (newHour:number, newMinute:number) => {
    // NumberInput, スライダーが変更になったとき
    // 時間を計算しなおす

    let newValue = newHour*60+newMinute

    if ( props.limitMaxHour < newHour ){
      newHour = props.limitMaxHour
      newValue = newHour*60 + props.limitMaxMinute      
    }   
    if( props.limitMaxHour == newHour){
      if ( props.limitMaxMinute < newMinute ){
        newMinute = props.limitMaxMinute
        newValue = newHour*60 + props.limitMaxMinute
      }
    }

    if ( props.limitMinHour > newHour ){
      newHour = props.limitMinHour
      newValue = newHour*60 + props.limitMinMinute      
    }   
    if( props.limitMinHour == newHour){
      if ( props.limitMinMinute > newMinute ){
        newMinute = props.limitMinMinute
        newValue = newHour*60 + props.limitMinMinute
      }
    }    

    // コールバック関数の呼び出し
    if ( (typeof props.onTimeChange !== "undefined") &&
         ((newHour != hour) || (newMinute != minute))){
      props.onTimeChange(newHour, newMinute)
    }

    if ((newHour != hour) || (newMinute != minute)){
      setHour(newHour)
      setMinute(newMinute)
      setValue(newValue)      
    }
  }

  const handleChangeHour = (value: string) => {
    // 時が変更になったとき
    let newHour = parseInt(value)
    let newMinute = minute
    setNewtime(newHour, newMinute)
  }

  const handleChangeMin = (value: string) => {
    // 分が変更になったとき
    let newMinute = parseInt(value)    
    let newHour = hour
    if (newMinute >= 60){
      if (newHour < 23){
        newMinute = 0
        newHour += 1
      }else{
        newMinute = 59
      }
    }
    setNewtime(newHour, newMinute)
  }

  const handleChange = (value: number) => {
    // スライダーの値が変更になったとき
    let newHour = Math.floor(value/60)
    let newMinute = value - 60*newHour
    setNewtime(newHour, newMinute)
  }

  return(
    <Flex >
      <NumberInput maxW={20}
                   mr={1}
                   value={hour}
                   defaultValue={props.initialHour}                   
                   max={props.limitMaxHour}
                   min={props.limitMinHour}
                   onChange={handleChangeHour}>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>

      <NumberInput maxW={20}
                   mr={5}
                   value={minute}
                   defaultValue={props.initialMinute}
                   max={(hour == props.limitMaxHour)?props.limitMaxMinute:60}
                   min={props.limitMinMinute}
                   onChange={handleChangeMin}>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>

      <Slider flex="1"
              focusThumbOnChange={false}
              value={value}
              onChange={handleChange}
              min={0}
              max={60*24-1}
              step={props.sliderStep}>
      <SliderTrack/>
      <SliderThumb fontSize="sm" boxSize="20px" bg="linkedin.600" />
      </Slider>
    </Flex>      
  )
}

// Propsのデフォルト値
TimePicker.defaultProps = {
  sliderStep: 15,
  limitMaxHour: 23,
  limitMaxMinute: 59,
  limitMinHour: 0,
  limitMinMinute: 0
}
  
export default TimePicker
