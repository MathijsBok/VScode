import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ticketApi, formApi } from '../lib/api';
import Layout from '../components/Layout';
import FormRenderer from '../components/FormRenderer';
import { Form } from '../types';

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [categoryId, _setCategoryId] = useState('');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch available forms
  const { data: forms } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const response = await formApi.getAll();
      return response.data as Form[];
    }
  });

  // Fetch selected form details
  const { data: selectedForm } = useQuery({
    queryKey: ['form', selectedFormId],
    queryFn: async () => {
      if (!selectedFormId) return null;
      const response = await formApi.getById(selectedFormId);
      return response.data as Form;
    },
    enabled: !!selectedFormId
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await ticketApi.create(data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Ticket created successfully!');
      navigate(`/tickets/${data.id}`);
    },
    onError: () => {
      toast.error('Failed to create ticket');
    }
  });

  const handleFormFieldChange = (fieldId: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateFormFields = (): boolean => {
    if (!selectedForm) return true;

    const errors: Record<string, string> = {};
    let isValid = true;

    selectedForm.formFields?.forEach(fieldAssignment => {
      const { field } = fieldAssignment;
      const value = formValues[field.id];

      if (field.required && (!value || value.trim() === '')) {
        errors[field.id] = `${field.label} is required`;
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate form fields if a form is selected
    if (selectedFormId && !validateFormFields()) {
      toast.error('Please fill in all required form fields');
      return;
    }

    // Prepare form responses if a form is selected
    const formResponses = selectedFormId && selectedForm
      ? selectedForm.formFields?.map(fieldAssignment => ({
          fieldId: fieldAssignment.fieldId,
          value: formValues[fieldAssignment.fieldId] || ''
        })).filter(response => response.value) // Only include non-empty values
      : undefined;

    createMutation.mutate({
      subject,
      description,
      channel: 'WEB',
      priority,
      categoryId: categoryId || undefined,
      formId: selectedFormId || undefined,
      formResponses
    });
  };

  const handleFormSelection = (formId: string) => {
    if (formId === '') {
      setSelectedFormId(null);
      setFormValues({});
      setFormErrors({});
    } else {
      setSelectedFormId(formId);
      setFormValues({});
      setFormErrors({});
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Ticket</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Submit a support request and our team will get back to you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Optional Form Selection */}
          {forms && forms.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Form Template (Optional)
              </h2>
              <div>
                <label htmlFor="formId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select a form to help us better understand your request
                </label>
                <select
                  id="formId"
                  value={selectedFormId || ''}
                  onChange={(e) => handleFormSelection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">No Form (Skip)</option>
                  {forms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show form description and fields if a form is selected */}
              {selectedForm && (
                <div className="mt-4">
                  {selectedForm.description && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {selectedForm.description}
                      </p>
                    </div>
                  )}

                  {selectedForm.formFields && selectedForm.formFields.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Form Fields
                      </h3>
                      <FormRenderer
                        fields={selectedForm.formFields.sort((a, b) => a.order - b.order)}
                        values={formValues}
                        onChange={handleFormFieldChange}
                        errors={formErrors}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Standard Fields (Always Visible) */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Ticket Information
            </h2>

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Provide detailed information about your request"
                  required
                />
              </div>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/user')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateTicket;
