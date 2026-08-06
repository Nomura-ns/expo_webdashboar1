import {PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, } from "recharts";

const COLORS = [
  "#00D2FF",
  "#00C853",
  "#FFA000",
];

interface Props{

    data:{
        name:string
        value:number
    }[]

}

export default function LoadPieChart({data}:Props){
    return(
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
               <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={60}
                    label={({name, percent}) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`}
                >
                    {data.map((_,i)=>
                        <Cell
                            key={i}
                            fill={COLORS[i%COLORS.length]}
                        />
                    )}
                </Pie>
                <Tooltip/>
                <Legend/>
            </PieChart>
        </ResponsiveContainer>
    )

}