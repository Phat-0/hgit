import {useState,type InputHTMLAttributes} from 'react';
import {docTienNghin,hienThiTien,nghinDongDeSua} from './tien-te';
type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'value'|'onChange'|'onFocus'|'onBlur'> & {value:string|number;onValueChange:(vnd:string)=>void};
export default function NhapTien({value,onValueChange,placeholder='250 → 250.000',...props}:Props){
 const [editing,setEditing]=useState(false),[raw,setRaw]=useState('');
 return <input {...props} type="text" inputMode="decimal" placeholder={placeholder} title="Nhập nghìn đồng: 250 → 250.000 ₫" value={editing?raw:hienThiTien(value)} onFocus={e=>{setRaw(nghinDongDeSua(value));setEditing(true);const input=e.currentTarget;requestAnimationFrame(()=>{if(document.activeElement===input)input.select();});}} onChange={e=>{const text=e.target.value;setRaw(text);const amount=docTienNghin(text);e.currentTarget.setCustomValidity(text.trim()&&amount===null?'Nhập số tiền hợp lệ, ví dụ 250 để được 250.000 ₫':'');onValueChange(amount===null?'':String(amount));}} onBlur={()=>setEditing(false)}/>;
}
