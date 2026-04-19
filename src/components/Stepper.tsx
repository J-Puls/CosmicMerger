import { Fragment } from 'react';
import { LuCheck } from 'react-icons/lu';

interface StepperProps {
    steps: string[];
    currentStep: number;
}

const Stepper = ({ steps, currentStep }: StepperProps) => {
    return (
        <div className="stepper">
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isActive = stepNumber === currentStep;

                return (
                    <Fragment key={stepNumber}>
                        <div className="stepper-step">
                            <div className={`stepper-circle ${isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}`}>
                                {isCompleted ? <LuCheck size={13} strokeWidth={3} /> : stepNumber}
                            </div>
                            <span className={`stepper-label ${isActive ? 'active' : ''}`}>{label}</span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
};

export default Stepper;
