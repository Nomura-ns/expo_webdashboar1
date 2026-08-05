import {PieChart, Pie, Cell, ResponsiveContainer, } from "recharts";

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
        <ResponsiveContainer width="100%" height={180}>
            <PieChart>
               <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={60}
                >
                    {data.map((_,i)=>
                        <Cell
                            key={i}
                            fill={COLORS[i%COLORS.length]}
                        />
                    )}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    )

}