interface EmptyProps {
  title?: string;
  description?: string;
  icon?: string;
}

export default function Empty({
  title = '暂无数据',
  description = '没有找到相关内容',
  icon = '📭',
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-medium text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
