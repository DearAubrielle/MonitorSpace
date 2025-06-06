interface ClockProps {
  titi: string; // Define 'time' as a string
}

const Clock: React.FC<ClockProps> = ({ titi }) => {
  return (
    <>
      <h1>{titi}</h1>
      <input />
    </>
  );
};

export default Clock;
