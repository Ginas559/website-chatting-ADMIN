import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useEffect } from 'react';

const toFormValues = (product) => ({
    name: product?.name || '',
    brand: product?.brand || '',
    category: product?.category || '',
    price: product?.price || product?.oldPrice || 0,
    salePrice: product?.salePrice || product?.price || 0,
    stock: product?.stock || 0,
    image: product?.image || '',
    imagesText: Array.isArray(product?.images) ? product.images.join('\n') : '',
    description: product?.description || '',
    shortDescription: product?.shortDescription || '',
    status: product?.status || 'ACTIVE',
    isPromotion: Boolean(product?.isPromotion),
    isLatest: Boolean(product?.isLatest),
    isBestSeller: Boolean(product?.isBestSeller),
});

const ProductFormModal = ({ open, product, loading, onCancel, onSubmit }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) form.setFieldsValue(toFormValues(product));
    }, [open, product, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        await onSubmit({
            ...values,
            images: String(values.imagesText || '').split('\n').map((item) => item.trim()).filter(Boolean),
        });
    };

    return (
        <Modal
            title={product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            okText={product ? 'Lưu' : 'Tạo'}
            cancelText="Hủy"
            width={760}
        >
            <Form form={form} layout="vertical">
                <div className="grid gap-4 md:grid-cols-2">
                    <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, min: 2, message: 'Tên tối thiểu 2 ký tự' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="brand" label="Thương hiệu" rules={[{ required: true, message: 'Nhập thương hiệu' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="category" label="Danh mục" rules={[{ required: true, message: 'Nhập danh mục' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
                        <Select options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'INACTIVE', label: 'INACTIVE' }]} />
                    </Form.Item>
                    <Form.Item name="price" label="Giá gốc" rules={[{ required: true, type: 'number', min: 1, message: 'Giá phải lớn hơn 0' }]}>
                        <InputNumber className="w-full" min={1} />
                    </Form.Item>
                    <Form.Item
                        name="salePrice"
                        label="Giá bán"
                        dependencies={['price']}
                        rules={[
                            { required: true, type: 'number', min: 0, message: 'Giá bán phải >= 0' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (value <= getFieldValue('price')) return Promise.resolve();
                                    return Promise.reject(new Error('Giá bán phải <= giá gốc'));
                                },
                            }),
                        ]}
                    >
                        <InputNumber className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item name="stock" label="Tồn kho" rules={[{ required: true, type: 'number', min: 0, message: 'Tồn kho không âm' }]}>
                        <InputNumber className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item name="image" label="Ảnh chính URL">
                        <Input />
                    </Form.Item>
                </div>
                <Form.Item name="imagesText" label="Danh sách ảnh URL (mỗi dòng một URL)">
                    <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="shortDescription" label="Mô tả ngắn">
                    <Input />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea rows={4} />
                </Form.Item>
                <div className="grid gap-4 md:grid-cols-3">
                    <Form.Item name="isPromotion" label="Khuyến mãi" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="isLatest" label="Mới nhất" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="isBestSeller" label="Bán chạy" valuePropName="checked"><Switch /></Form.Item>
                </div>
            </Form>
        </Modal>
    );
};

export default ProductFormModal;
