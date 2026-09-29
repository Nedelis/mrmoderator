import { ReactNode } from 'react';

interface PageWrapperProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
}

export default function PageWrapper({ title, subtitle, actions, children }: PageWrapperProps) {
    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div>
                    <h2>{title}</h2>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                {actions && <div className="page-actions">{actions}</div>}
            </div>
            <div className="page-body">{children}</div>
        </div>
    );
}
