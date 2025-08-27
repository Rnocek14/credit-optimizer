import { useTutorial } from './TutorialProvider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function TutorialToggle() {
  const { enabled, setEnabled } = useTutorial();
  
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="tutorial-mode"
        checked={enabled}
        onCheckedChange={setEnabled}
        aria-labelledby="tutorial-mode-label"
      />
      <Label id="tutorial-mode-label" htmlFor="tutorial-mode" className="text-sm font-medium">
        Tutorial Mode
      </Label>
    </div>
  );
}