export declare class CreateTaskAlertDto {
    portfolio_id: string;
    lease_id: string;
    category: 'alert' | 'task';
    title: string;
    details?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    sortOrder?: number;
    is_resolved?: boolean;
    alert_type?: string;
    due_timeline?: string;
    suggested_action?: string;
}
