import { FileText, Loader2, Save, Upload, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ExpenseFormData } from "../types/expense";
import { getExpenseCategories } from "../utils/expenseUtils";
import {
  formatFileSize,
  isValidReceiptFile,
  parseReceiptFile,
} from "../utils/receiptParser";

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData | ExpenseFormData[]) => void;
  initialData?: ExpenseFormData;
  title: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    reimbursed: false,
  });

  const [formDataList, setFormDataList] = useState<ExpenseFormData[]>([]);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const categories = getExpenseCategories();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "",
        reimbursed: false,
      });
    }
    // Clear uploaded files when form is reset/reopened
    setUploadedFiles([]);
    setFormDataList([]);
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If multiple files, submit all forms
    if (uploadedFiles.length > 1) {
      const invalidForms = formDataList.some(
        (form) => !form.description.trim() || !form.amount || !form.category
      );
      if (invalidForms) {
        alert("Please fill in all required fields for each expense.");
        return;
      }
      onSubmit(formDataList);
    } else {
      // Single form submission
      if (
        !formData.description.trim() ||
        !formData.amount ||
        !formData.category
      ) {
        return;
      }
      onSubmit(formData);
    }
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(isValidReceiptFile);

    if (validFiles.length === 0) {
      alert(
        "Please upload valid image files (JPG, PNG, WebP) or PDF files under 10MB."
      );
      return;
    }

    setUploadedFiles(validFiles);

    if (validFiles.length === 1) {
      // Single file - parse into main form
      await parseReceipt(validFiles[0]);
    } else {
      // Multiple files - create form data for each
      const newFormDataList = validFiles.map(() => ({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "",
        reimbursed: false,
      }));
      setFormDataList(newFormDataList);

      // Parse each file
      for (let i = 0; i < validFiles.length; i++) {
        await parseReceiptForIndex(validFiles[i], i);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const parseReceipt = async (file: File) => {
    setIsParsingReceipt(true);
    try {
      const parsedData = await parseReceiptFile(file);
      if (parsedData) {
        setFormData((prev) => ({
          ...prev,
          description: parsedData.description,
          amount: parsedData.amount,
          date: parsedData.date,
          category: parsedData.category,
        }));
      }
    } catch (error) {
      console.error("Failed to parse receipt:", error);
      alert("Failed to parse receipt. Please fill in the details manually.");
    } finally {
      setIsParsingReceipt(false);
    }
  };

  const parseReceiptForIndex = async (file: File, index: number) => {
    try {
      const parsedData = await parseReceiptFile(file);
      if (parsedData) {
        setFormDataList((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  description: parsedData.description,
                  amount: parsedData.amount,
                  date: parsedData.date,
                  category: parsedData.category,
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error(`Failed to parse receipt ${index + 1}:`, error);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length > 1) {
      setFormDataList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleMultiFormChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormDataList((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [name]:
                type === "checkbox"
                  ? (e.target as HTMLInputElement).checked
                  : value,
            }
          : item
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Receipt Upload Section */}
          {uploadedFiles.length === 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Receipt (Optional)
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="receipt-upload"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isParsingReceipt}
                />
                <label
                  htmlFor="receipt-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload
                    className={`w-8 h-8 ${
                      isDragOver ? "text-blue-500" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isDragOver ? "text-blue-700" : "text-gray-600"
                    }`}
                  >
                    {isDragOver
                      ? "Drop files here"
                      : "Click to upload or drag and drop receipt images or PDFs"}
                  </span>
                  <span className="text-xs text-gray-500">
                    Supports JPG, PNG, WebP, PDF (max 10MB each)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Show forms - either from uploaded files or manual entry */}
          <div className="space-y-6">
            {uploadedFiles.length > 1 && (
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Expense Forms ({uploadedFiles.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFiles([]);
                    setFormDataList([]);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Upload Different Files
                </button>
              </div>
            )}

            {/* Parsing Status */}
            {isParsingReceipt && (
              <div className="mb-4 flex items-center space-x-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Parsing receipt...</span>
              </div>
            )}

            {(uploadedFiles.length > 1 ? formDataList : [formData]).map(
              (currentFormData, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  {uploadedFiles.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {uploadedFiles.length > 1
                            ? `Expense ${index + 1}: `
                            : ""}
                          {uploadedFiles[index]?.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({formatFileSize(uploadedFiles[index]?.size || 0)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                        disabled={isParsingReceipt}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        name="description"
                        value={currentFormData.description}
                        onChange={(e) =>
                          uploadedFiles.length > 1
                            ? handleMultiFormChange(index, e)
                            : handleChange(e)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter expense description"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={currentFormData.amount}
                        onChange={(e) =>
                          uploadedFiles.length > 1
                            ? handleMultiFormChange(index, e)
                            : handleChange(e)
                        }
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={currentFormData.date}
                        onChange={(e) =>
                          uploadedFiles.length > 1
                            ? handleMultiFormChange(index, e)
                            : handleChange(e)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        name="category"
                        value={currentFormData.category}
                        onChange={(e) =>
                          uploadedFiles.length > 1
                            ? handleMultiFormChange(index, e)
                            : handleChange(e)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="reimbursed"
                          checked={currentFormData.reimbursed}
                          onChange={(e) =>
                            uploadedFiles.length > 1
                              ? handleMultiFormChange(index, e)
                              : handleChange(e)
                          }
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          Already reimbursed
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              disabled={isParsingReceipt}
            >
              <Save className="w-4 h-4" />
              {uploadedFiles.length > 1
                ? `Save All (${uploadedFiles.length})`
                : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
