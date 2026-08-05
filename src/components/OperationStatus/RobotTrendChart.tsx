import {ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, } from "recharts";

interface Props {
  data: {
    time: string;
    speed: number;
    torque: number;
  }[];
}

export default function RobotTrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Line
          dataKey="speed"
          stroke="#00D2FF"
          strokeWidth={2}
        />
        <Line
          dataKey="torque"
          stroke="#FFB000"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}