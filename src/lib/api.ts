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

// --------------------------------------------------
// AUTH HEADERS
// --------------------------------------------------

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('minexa_token');

  if (!token) {
    throw new Error('You are not logged in.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// --------------------------------------------------
// GET LEAVE REQUESTS
// --------------------------------------------------

export async function getLeaveRequests(): Promise<
  LeaveRequestApi[]
> {
  const response = await fetch(
    `${API_URL}/leave-requests`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const errorData =
      await response
        .json()
        .catch(() => null);

    throw new Error(
      errorData?.message ??
        'Failed to fetch leave requests',
    );
  }

  const data = await response.json();

  return data.requests;
}

// --------------------------------------------------
// CREATE LEAVE REQUEST
// --------------------------------------------------

export async function createLeaveRequest(
  payload: {
    leaveType:
      | 'annual'
      | 'sick'
      | 'personal'
      | 'emergency';

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

      headers: getAuthHeaders(),

      body: JSON.stringify({
        leaveType: payload.leaveType,
        startDate: payload.startDate,
        endDate: payload.endDate,
        days: payload.days,
        reason: payload.reason,
      }),
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

  const data = await response.json();

  return data.request;
}

// --------------------------------------------------
// CANCEL LEAVE REQUEST
// --------------------------------------------------

export async function cancelLeaveRequest(
  id: number,
): Promise<LeaveRequestApi> {
  const response = await fetch(
    `${API_URL}/leave-requests/${id}/cancel`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const errorData =
      await response
        .json()
        .catch(() => null);

    throw new Error(
      errorData?.message ??
        'Failed to cancel leave request',
    );
  }

  const data = await response.json();

  return data.request;
}
export type LoginResponse = {
  status: 'success';
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    workerId: number | null;
  };
};

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ??
        'Unable to login. Please check your credentials.',
    );
  }

  return data;
}

export type AuthUserApi = {
  id: number;
  name: string;
  email: string;
  role:
    | 'PLATFORM_ADMIN'
    | 'MINE_MANAGER'
    | 'SAFETY_OFFICER'
    | 'FIELD_WORKER';
  workerId: number | null;
  employeeCode?: string | null;
  accountStatus?: string;
  isVerified?: boolean;
  verifiedAt?: string | null;
  mfaEnabled?: boolean;
};

export async function getCurrentUser(): Promise<AuthUserApi> {
  const token = localStorage.getItem('minexa_token');

  if (!token) {
    throw new Error('No authentication token found.');
  }

  const response = await fetch(
    `${API_URL}/auth/me`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ??
        'Your session is no longer valid.',
    );
  }

  return data.user;
}


/* =====================================================
   TYPES
===================================================== */

export type RegistrationRole =
  | 'FIELD_WORKER'
  | 'MINE_MANAGER'
  | 'SAFETY_OFFICER';

export type RegistrationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type RegistrationRequest = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;

  requested_role: RegistrationRole;

  mine_id: number | null;
  mine_name?: string | null;

  employee_id?: string | null;
  department?: string | null;
  designation?: string | null;

  certification_number?: string | null;
  safety_training_id?: string | null;

  status: RegistrationStatus;

  rejection_reason?: string | null;

  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
};

export type Mine = {
  id: number;
  name: string;
  mine_code: string;
  location: string | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export type RegisterPayload = {
  name: string;
  email: string;
  phone?: string;
  password: string;

  requestedRole: RegistrationRole;

  mineId: number;

  employeeId?: string;

  department?: string;

  designation?: string;

  certificationNumber?: string;

  safetyTrainingId?: string;
};

/* =====================================================
   TOKEN
===================================================== */

const getToken = (): string | null => {
  return localStorage.getItem('minexa_token');
};

const authHeaders = (): HeadersInit => {
  const token = getToken();

  return {
    'Content-Type': 'application/json',

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

/* =====================================================
   MINE LIST
===================================================== */

export async function getMines(): Promise<Mine[]> {
  const response = await fetch(`${API_URL}/mines`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || 'Failed to fetch mines'
    );
  }

  return data.mines || data;
}

/* =====================================================
   REGISTER
===================================================== */

export async function registerUser(
  payload: RegisterPayload
) {
  const response = await fetch(
    `${API_URL}/auth/register`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || 'Registration failed'
    );
  }

  return data;
}

/* =====================================================
   ADMIN — REGISTRATION QUEUE
===================================================== */

export async function getAdminRegistrations(): Promise<
  RegistrationRequest[]
> {
  const response = await fetch(
    `${API_URL}/admin/registrations`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to fetch registration requests'
    );
  }

  return data.registrations || [];
}

/* =====================================================
   ADMIN — APPROVE
===================================================== */

export async function approveAdminRegistration(
  registrationId: number
) {
  const response = await fetch(
    `${API_URL}/admin/registrations/${registrationId}/approve`,
    {
      method: 'POST',
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to approve registration'
    );
  }

  return data;
}

/* =====================================================
   ADMIN — REJECT
===================================================== */

export async function rejectAdminRegistration(
  registrationId: number,
  reason: string
) {
  const response = await fetch(
    `${API_URL}/admin/registrations/${registrationId}/reject`,
    {
      method: 'POST',
      headers: authHeaders(),

      body: JSON.stringify({
        reason,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to reject registration'
    );
  }

  return data;
}

/* =====================================================
   MANAGER — WORKER QUEUE
===================================================== */

export async function getManagerWorkerRegistrations(): Promise<
  RegistrationRequest[]
> {
  const response = await fetch(
    `${API_URL}/manager/worker-registrations`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to fetch worker registrations'
    );
  }

  return data.registrations || [];
}

/* =====================================================
   MANAGER — APPROVE WORKER
===================================================== */

export async function approveWorkerRegistration(
  registrationId: number
) {
  const response = await fetch(
    `${API_URL}/manager/worker-registrations/${registrationId}/approve`,
    {
      method: 'POST',
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to approve worker'
    );
  }

  return data;
}

/* =====================================================
   MANAGER — REJECT WORKER
===================================================== */

export async function rejectWorkerRegistration(
  registrationId: number,
  reason: string
) {
  const response = await fetch(
    `${API_URL}/manager/worker-registrations/${registrationId}/reject`,
    {
      method: 'POST',
      headers: authHeaders(),

      body: JSON.stringify({
        reason,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to reject worker'
    );
  }

  return data;
}

/* =====================================================
   SAFETY — VERIFICATION QUEUE
===================================================== */

export async function getSafetyWorkerRegistrations(): Promise<
  RegistrationRequest[]
> {
  const response = await fetch(
    `${API_URL}/safety/worker-registrations`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to fetch safety verification requests'
    );
  }

  return data.registrations || [];
}

/* =====================================================
   SAFETY — VERIFY
===================================================== */

export async function verifyWorkerRegistration(
  registrationId: number
) {
  const response = await fetch(
    `${API_URL}/safety/worker-registrations/${registrationId}/verify`,
    {
      method: 'POST',
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to verify worker'
    );
  }

  return data;
}

/* =====================================================
   SAFETY — REJECT
===================================================== */

export async function rejectSafetyRegistration(
  registrationId: number,
  reason: string
) {
  const response = await fetch(
    `${API_URL}/safety/worker-registrations/${registrationId}/reject`,
    {
      method: 'POST',
      headers: authHeaders(),

      body: JSON.stringify({
        reason,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Failed to reject safety verification'
    );
  }

  return data;
}