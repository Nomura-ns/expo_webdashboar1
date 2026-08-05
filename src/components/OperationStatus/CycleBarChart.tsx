import { ResponsiveContainer, BarChart, Bar, XAxis,YAxis,Tooltip, } from 'recharts'
interface Props{
    data:{
        job:string
        cycle:number
    }[]
}

export default function CycleBarChart({data}:Props){
 return(
        <ResponsiveContainer width="90%" height={180}>
            <BarChart data={data}>
                <XAxis dataKey="job"/>
                <YAxis/>
                <Tooltip/>
                <Bar
                    dataKey="cycle"
                    fill="#00D2FF"
                    radius={[4,4,0,0]}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}