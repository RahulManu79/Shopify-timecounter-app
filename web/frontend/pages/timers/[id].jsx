import { useParams } from "react-router-dom";
import TimerForm from "../../components/TimerForm";

export default function EditTimerPage() {
  const { id } = useParams();
  return <TimerForm timerId={id} />;
}
