const API_URL = 'http://localhost:3000/api/v1';

export type LeaveRequestApi = {
  id: number;
  worker_id: number;
  leave_type:
    | 'annual'
    | 'sick'
    | 'personal'
    | 'emergency';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'cancelled';
  submitted_at: string;
};

export async function getLeaveRequests(): Promise<
  LeaveRequestApi[]
> {
  const response = await fetch(
    `${API_URL}/leave-requests`,
  );

  if (!response.ok) {
    throw new Error(
      'Failed to fetch leave requests',
    );
  }

  const data = await response.json();

  return data.requests;
}

export async function createLeaveRequest(
  payload: {
    workerId: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
  },
): Promise<LeaveRequestApi> {
  const response = await fetch(
    `${API_URL}/leave-requests`,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify(
        payload,
      ),
    },
  );

  if (!response.ok) {
    const errorData =
      await response
        .json()
        .catch(() => null);

    throw new Error(
      errorData?.message ??
        'Failed to create leave request',
    );
  }

  const data =
    await response.json();

  return data.request;
}
export async function cancelLeaveRequest(
  id: number,
): Promise<LeaveRequestApi> {
  const response = await fetch(
    `${API_URL}/leave-requests/${id}/cancel`,
    {
      method: 'PATCH',
    },
  );

  if (!response.ok) {
    const errorData =
      await response.json().catch(() => null);

    throw new Error(
      errorData?.message ??
        'Failed to cancel leave request',
    );
  }

  const data = await response.json();

  return data.request;
}