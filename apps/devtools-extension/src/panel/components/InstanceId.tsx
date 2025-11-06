export default function InstanceId(props: {id: string}) {
  const [name, instance] = props.id.split(':');

  return (
    <div className="instance-id">
      <strong>{name}</strong> : {instance}
    </div>
  );
}
