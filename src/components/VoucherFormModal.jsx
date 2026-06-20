// Tien - Modal form cho việc tạo mới hoặc cập nhật Voucher
import { Form, Input, InputNumber, Modal, Select, Switch, DatePicker } from 'antd';
import { useEffect } from 'react';
import dayjs from 'dayjs';

// Tien - Chuyển đổi dữ liệu voucher từ DB sang dạng hiển thị trên Form
const toFormValues = (voucher) => ({
    code: voucher?.code || '',
    description: voucher?.description || '',
    discountType: voucher?.discountType || 'PERCENT',
    discountValue: voucher?.discountValue || 0,
    maxDiscountAmount: voucher?.maxDiscountAmount || 0,
    minOrderAmount: voucher?.minOrderAmount || 0,
    dates: voucher?.startDate && voucher?.endDate ? [dayjs(voucher.startDate), dayjs(voucher.endDate)] : null,
    usageLimit: voucher?.usageLimit || 1,
    isActive: voucher ? Boolean(voucher.isActive) : true,
});

const VoucherFormModal = ({ open, voucher, loading, onCancel, onSubmit }) => {
    const [form] = Form.useForm();
    const discountType = Form.useWatch('discountType', form);

    // Tien - Cập nhật dữ liệu vào form khi mở modal hoặc thay đổi voucher
    useEffect(() => {
        if (open) {
            form.setFieldsValue(toFormValues(voucher));
        } else {
            form.resetFields();
        }
    }, [open, voucher, form]);

    // Tien - Xử lý khi nhấn nút OK để submit form
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const [startDate, endDate] = values.dates || [];
            
            const payload = {
                ...values,
                startDate: startDate ? startDate.toISOString() : null,
                endDate: endDate ? endDate.toISOString() : null,
            };
            
            // Xóa trường dates tạm thời dùng cho RangePicker
            delete payload.dates;
            
            // Nếu loại giảm giá là AMOUNT thì không cần lưu maxDiscountAmount hoặc reset về 0
            if (payload.discountType === 'AMOUNT') {
                payload.maxDiscountAmount = 0;
            }

            await onSubmit(payload);
        } catch (error) {
            // Validate thất bại, antd tự hiển thị lỗi dưới input
            console.error('Validate Voucher Form failed:', error);
        }
    };

    return (
        <Modal
            title={voucher ? 'Cập nhật mã giảm giá' : 'Thêm mã giảm giá mới'}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            okText={voucher ? 'Cập nhật' : 'Tạo mới'}
            cancelText="Hủy"
            width={650}
        >
            <Form 
                form={form} 
                layout="vertical"
                className="mt-4"
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <Form.Item 
                        name="code" 
                        label="Mã giảm giá (Voucher Code)" 
                        rules={[
                            { required: true, message: 'Vui lòng nhập mã giảm giá' },
                            { pattern: /^[A-Z0-9_-]+$/, message: 'Mã chỉ được chứa chữ cái in hoa, số, gạch ngang và gạch dưới' }
                        ]}
                        normalize={(val) => val ? String(val).toUpperCase().trim() : ''}
                    >
                        <Input placeholder="Ví dụ: SUMMER2026, SALE50" disabled={!!voucher} />
                    </Form.Item>

                    <Form.Item 
                        name="isActive" 
                        label="Trạng thái kích hoạt" 
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                    </Form.Item>
                </div>

                <Form.Item 
                    name="description" 
                    label="Mô tả voucher" 
                    rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
                >
                    <Input.TextArea rows={2} placeholder="Mô tả công dụng voucher (Ví dụ: Giảm 10% cho đơn hàng từ 200k, tối đa 50k)" />
                </Form.Item>

                <div className="grid gap-4 md:grid-cols-3">
                    <Form.Item 
                        name="discountType" 
                        label="Loại giảm giá" 
                        rules={[{ required: true }]}
                    >
                        <Select options={[
                            { value: 'PERCENT', label: 'Phần trăm (%)' },
                            { value: 'AMOUNT', label: 'Số tiền cố định (VND)' }
                        ]} />
                    </Form.Item>

                    <Form.Item 
                        name="discountValue" 
                        label="Giá trị giảm" 
                        dependencies={['discountType']}
                        rules={[
                            { required: true, message: 'Nhập giá trị giảm' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (value === undefined || value === null || value < 0) {
                                        return Promise.reject(new Error('Giá trị phải >= 0'));
                                    }
                                    const type = getFieldValue('discountType');
                                    if (type === 'PERCENT' && value > 100) {
                                        return Promise.reject(new Error('Phần trăm giảm không được vượt quá 100%'));
                                    }
                                    if (type === 'AMOUNT' && value < 1000) {
                                        return Promise.reject(new Error('Số tiền giảm tối thiểu là 1,000 VND'));
                                    }
                                    return Promise.resolve();
                                }
                            })
                        ]}
                    >
                        <InputNumber 
                            className="w-full" 
                            min={0} 
                            formatter={(value) => discountType === 'AMOUNT' ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : `${value}`}
                            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                            addonAfter={discountType === 'PERCENT' ? '%' : 'đ'}
                        />
                    </Form.Item>

                    <Form.Item 
                        name="maxDiscountAmount" 
                        label="Giảm tối đa (VND)" 
                        dependencies={['discountType']}
                        rules={[
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    const type = getFieldValue('discountType');
                                    if (type === 'PERCENT' && (!value || value <= 0)) {
                                        return Promise.reject(new Error('Giảm tối đa phải > 0 khi dùng phần trăm'));
                                    }
                                    return Promise.resolve();
                                }
                            })
                        ]}
                    >
                        <InputNumber 
                            className="w-full" 
                            min={0} 
                            disabled={discountType === 'AMOUNT'}
                            placeholder={discountType === 'AMOUNT' ? 'Không áp dụng' : '0'}
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                            addonAfter="đ"
                        />
                    </Form.Item>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Form.Item 
                        name="minOrderAmount" 
                        label="Giá trị đơn hàng tối thiểu" 
                        rules={[{ required: true, message: 'Vui lòng nhập giá trị đơn hàng tối thiểu' }]}
                    >
                        <InputNumber 
                            className="w-full" 
                            min={0}
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                            addonAfter="đ"
                        />
                    </Form.Item>

                    <Form.Item 
                        name="usageLimit" 
                        label="Giới hạn số lần dùng (Toàn hệ thống)" 
                        rules={[{ required: true, message: 'Vui lòng nhập số lần dùng' }]}
                    >
                        <InputNumber className="w-full" min={1} precision={0} />
                    </Form.Item>
                </div>

                <Form.Item 
                    name="dates" 
                    label="Thời gian áp dụng (Bắt đầu - Kết thúc)" 
                    rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian' }]}
                >
                    <DatePicker.RangePicker 
                        showTime 
                        format="DD/MM/YYYY HH:mm" 
                        className="w-full" 
                        placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default VoucherFormModal;
