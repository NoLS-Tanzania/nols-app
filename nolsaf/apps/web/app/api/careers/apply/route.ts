import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const jobId = formData.get('jobId') as string;
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const coverLetter = formData.get('coverLetter') as string;
    const resume = formData.get('resume') as File | null;
    const portfolio = formData.get('portfolio') as string | null;
    const linkedIn = formData.get('linkedIn') as string | null;
    const referredBy = formData.get('referredBy') as string | null;

    // Validate required fields
    if (!jobId || !fullName || !email || !phone || !coverLetter) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, fullName, email, phone, and coverLetter are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate resume if provided
    if (resume) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (resume.size > maxSize) {
        return NextResponse.json(
          { error: 'Resume file size must be less than 5MB' },
          { status: 400 }
        );
      }

      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(resume.type)) {
        return NextResponse.json(
          { error: 'Resume must be a PDF or Word document' },
          { status: 400 }
        );
      }
    }

    // Prepare application data
    const applicationData = {
      jobId,
      fullName,
      email,
      phone,
      coverLetter,
      portfolio: portfolio || null,
      linkedIn: linkedIn || null,
      referredBy: referredBy || null,
      submittedAt: new Date().toISOString(),
      resumeFileName: resume?.name || null,
      resumeSize: resume?.size || null,
      resumeType: resume?.type || null,
    };

    // Forward to backend API
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    const backendUrl = base.replace(/\/$/, '') + '/api/careers/apply';

    try {
      // Create FormData for backend
      const backendFormData = new FormData();
      backendFormData.append('jobId', jobId);
      backendFormData.append('fullName', fullName);
      backendFormData.append('email', email);
      backendFormData.append('phone', phone);
      backendFormData.append('coverLetter', coverLetter);
      if (resume) {
        backendFormData.append('resume', resume);
      }
      if (portfolio) backendFormData.append('portfolio', portfolio);
      if (linkedIn) backendFormData.append('linkedIn', linkedIn);
      if (referredBy) backendFormData.append('referredBy', referredBy);

      const backendResponse = await fetch(backendUrl, {
        method: 'POST',
        body: backendFormData,
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        return NextResponse.json({
          success: true,
          message: backendData.message || 'Application submitted successfully',
          applicationId: backendData.applicationId || null,
        });
      } else {
        const errorData = await backendResponse.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.error || `Backend API error: ${backendResponse.status}` },
          { status: backendResponse.status }
        );
      }
    } catch (backendError: any) {
      console.error('Backend API error:', backendError);
      return NextResponse.json(
        { error: backendError.message || 'Failed to connect to backend API. Please try again or email careers@nolsaf.com directly.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Career application error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process application. Please try again or email careers@nolsaf.com directly.' },
      { status: 500 }
    );
  }
}
